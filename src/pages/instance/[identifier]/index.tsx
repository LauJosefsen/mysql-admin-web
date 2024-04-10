import { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { RowDataPacket } from 'mysql2/promise'
import { useRouter } from 'next/router'
import Link from 'next/link'
import mysql from 'mysql2/promise'
import { getConfig } from '@/lib/config'

type TransactionInfoDict = {
    [threadId: number]: TransactionInfo
}

type TransactionInfo = {
    activeTime: number
    info: string[]
}

type Process = {
    Id: number
    User: string
    Host: string
    db: string | null
    Command: string
    Time: number
    State: string
    Info: string
    Progress: number
}

type ProcessWithTransaction = Process & {
    transaction: TransactionInfo | null
}

type Repo = {
    processList: ProcessWithTransaction[]
    innodbStatus: string
}

const stringToColor = function (str: string | null): string {
    if (!str) {
        return '#000000'
    }
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    let colour = '#'
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xff
        colour += ('00' + value.toString(16)).slice(-2)
    }
    return colour
}

const blackOrWhite = function (hex: string): string {
    const r = parseInt(hex.slice(1, 2), 16)
    const g = parseInt(hex.slice(3, 2), 16)
    const b = parseInt(hex.slice(5, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 155 ? '#000000' : '#ffffff'
}

const parseInnoDbStatus = (innoDbStatus: string): TransactionInfoDict => {
    const splitInnoDbStatus = innoDbStatus.split('\n') // Find the line LIST OF TRANSACTIONS FOR EACH SESSION:\n
    const transactionsStartIndex = splitInnoDbStatus.findIndex((line) =>
        line.includes('LIST OF TRANSACTIONS FOR EACH SESSION:')
    )

    // After the transactionStartIndex, read transactions lines, splitting by lines starting with ---TRANSACTION, until we meet the line --------\n
    const transactions: TransactionInfoDict = {}

    let transaction: TransactionInfo = {
        activeTime: -1,
        info: [],
    }

    for (let i = transactionsStartIndex; i < splitInnoDbStatus.length; i++) {
        const line = splitInnoDbStatus[i]
        if (line.startsWith('--------')) {
            break
        }

        if (line.startsWith('---TRANSACTION')) {
            // Get the active time from the format '..., ACTIVE 1 sec'
            const index = line.indexOf(', ACTIVE')
            const activeTime = parseInt(line.slice(index + 8))

            transaction = {
                activeTime,
                info: [],
            }
        }

        if (line.startsWith('MariaDB thread id')) {
            // Get the thread id from the format `MariaDB thread id 3, ...`
            const threadId = parseInt(line.split(' ')[3])

            transactions[threadId] = transaction
        }

        transaction.info.push(line)
    }

    return transactions
}

export const getServerSideProps = (async (context) => {
    const instance = getConfig().instances[context.query.identifier as string]

    if (!instance) {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            },
        }
    }

    // Fetch data from external API
    const conn = await mysql.createConnection(instance)

    const [processListResult] = await conn.query('SHOW PROCESSLIST;')
    const processList: Process[] = processListResult as Process[]
    const [innoDbStatusResult] = await conn.query<RowDataPacket[]>(
        'SHOW ENGINE INNODB STATUS;'
    )

    const innoDbStatusString = innoDbStatusResult[0]['Status'] as string
    // Convert the status string
    const innoDbStatus = parseInnoDbStatus(innoDbStatusString as string)

    const processListWithTransaction: ProcessWithTransaction[] =
        processList.map((process) => {
            const transaction = innoDbStatus[process.Id] || null
            return {
                ...process,
                transaction,
            }
        })

    // Order by transaction.activeTime desc, then by process.Time desc
    processListWithTransaction.sort((a, b) => {
        if (a.transaction && !b.transaction) {
            return -1
        }
        if (!a.transaction && b.transaction) {
            return 1
        }
        if (a.transaction && b.transaction) {
            return b.transaction.activeTime - a.transaction.activeTime
        }
        return b.Time - a.Time
    })

    const repo: Repo = {
        processList: processListWithTransaction,
        innodbStatus: innoDbStatusString,
    }
    // Pass data to the page via props
    return { props: { repo } }
}) satisfies GetServerSideProps<{ repo: Repo }>

export default function Home({
    repo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter()
    return (
        <main>
            <div className="text-xl breadcrumbs">
                <ul>
                    <li>
                        <Link href="/">Instance Selector</Link>
                    </li>
                    <li>
                        <a>{router.query.identifier}</a>
                    </li>
                </ul>
            </div>
            <div className="overflow-x-auto">
                <table className="table table-xs">
                    <thead>
                        <tr>
                            <th>🔥</th>
                            <th>Id</th>
                            <th>User</th>
                            <th>Host</th>
                            <th>db</th>
                            <th>Command</th>
                            <th>Time</th>
                            <th>State</th>
                            <th>Info</th>
                            <th>Progress</th>
                            <th>Transaction Time</th>
                            <th>Transaction Info</th>
                        </tr>
                    </thead>
                    <tbody>
                        {repo.processList.map(
                            (item: ProcessWithTransaction) => (
                                <tr
                                    key={item.Id}
                                    className={`${item.transaction?.activeTime && item.transaction.activeTime > 10 ? 'bg-red-300' : ''}`}
                                >
                                    <td className={'align-top'}>
                                        {/* Make kill button with skull emoji, on click send a request to /api/kill with the id in the body */}
                                        <button
                                            onClick={async () => {
                                                if (
                                                    !confirm(
                                                        `Are you sure you want to kill process ${item.Id} by user '${item.User}'?`
                                                    )
                                                ) {
                                                    return
                                                }
                                                await fetch('/api/kill', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type':
                                                            'application/json',
                                                    },
                                                    body: JSON.stringify({
                                                        id: item.Id,
                                                    }),
                                                }).then(() => {
                                                    // Refresh the page after the request is done
                                                    window.location.reload()
                                                })
                                            }}
                                        >
                                            💀
                                        </button>
                                    </td>
                                    <td className={'align-top'}>{item.Id}</td>
                                    <td className={'align-top'}>
                                        <div
                                            style={{
                                                color: blackOrWhite(
                                                    stringToColor(item.User)
                                                ),
                                                backgroundColor: stringToColor(
                                                    item.User
                                                ),
                                                borderColor: stringToColor(
                                                    item.User
                                                ),
                                            }}
                                            className={'badge'}
                                        >
                                            {item.User}
                                        </div>
                                    </td>
                                    <td className={'align-top'}>{item.Host}</td>
                                    <td className={'align-top'}>
                                        <div
                                            style={{
                                                color: blackOrWhite(
                                                    stringToColor(item.db)
                                                ),
                                                backgroundColor: stringToColor(
                                                    item.db
                                                ),
                                                borderColor: stringToColor(
                                                    item.db
                                                ),
                                            }}
                                            className={'badge'}
                                        >
                                            {item.db}
                                        </div>
                                    </td>
                                    <td className={'align-top'}>
                                        {item.Command}
                                    </td>
                                    <td className={'align-top'}>
                                        {item.Time} s
                                    </td>
                                    <td className={'align-top'}>
                                        {item.State}
                                    </td>
                                    <td className="font-mono">{item.Info}</td>
                                    <td className={'align-top'}>
                                        {item.Progress}
                                    </td>
                                    <td className={'align-top'}>
                                        {item.transaction?.activeTime}
                                        {item.transaction?.activeTime
                                            ? ' s'
                                            : ''}
                                    </td>
                                    <td className="align-top font-mono whitespace-pre-line">
                                        {item.transaction?.info.join('\n')}
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th>🔥</th>
                            <th>Id</th>
                            <th>User</th>
                            <th>Host</th>
                            <th>db</th>
                            <th>Command</th>
                            <th>Time</th>
                            <th>State</th>
                            <th>Info</th>
                            <th>Progress</th>
                            <th>Transaction Time</th>
                            <th>Transaction Info</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="w-9/12 m-5 collapse collapse-plus bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title text-xl font-medium">
                    Click to see complete innodb status result.
                </div>
                <div className="collapse-content whitespace-pre-line font-mono">
                    {repo.innodbStatus}
                </div>
            </div>
        </main>
    )
}
