import { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { Config, getConfig } from '@/lib/config'

type Repo = {
    instances: string[]
}

export const getServerSideProps = (async () => {
    // Load available instances

    const repo: Repo = { instances: Object.keys(getConfig().instances) }
    // Pass data to the page via props
    return { props: { repo } }
}) satisfies GetServerSideProps<{ repo: Repo }>

export default function Home({
    repo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <main>
            <div className="text-xl breadcrumbs">
                <ul>
                    <li>
                        <a>Instance Selector</a>
                    </li>
                </ul>
            </div>
            <ul>
                {repo.instances.map((instance) => (
                    <li key={instance}>
                        <a href={`/instance/${instance}`}>{instance}</a>
                    </li>
                ))}
            </ul>
        </main>
    )
}
