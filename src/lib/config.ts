import assert from 'assert'

export type Instance = {
    host: string
    port: number
    user: string
    password: string | undefined
    database: string | undefined
}

export type Instances = { [key: string]: Instance }

export type Config = {
    instances: Instances
}

export const getConfig = (): Config => {
    // Load database instances from the environment variables
    const dbInstancesEnv = process.env.DB_INSTANCES
    assert(dbInstancesEnv, 'DB_INSTANCES is required')
    const dbInstances = dbInstancesEnv.split(',')

    // For each db instance, load the host, port, user, password, and optional database
    const instances: Instances = dbInstances.reduce((acc, dbInstance) => {
        const dbInstanceUpper = dbInstance.toUpperCase()
        const dbInstanceHostEnv = process.env[`${dbInstanceUpper}_HOST`]
        assert(dbInstanceHostEnv, `${dbInstanceUpper}_HOST is required`)
        const dbInstanceHost = dbInstanceHostEnv

        const dbInstancePortEnv = process.env[`${dbInstanceUpper}_PORT`]
        assert(dbInstancePortEnv, `${dbInstanceUpper}_PORT is required`)

        const dbInstancePort = parseInt(dbInstancePortEnv)
        assert(dbInstancePort, `${dbInstanceUpper}_PORT must be a number`)

        const dbInstanceUserEnv = process.env[`${dbInstanceUpper}_USER`]
        assert(dbInstanceUserEnv, `${dbInstanceUpper}_USER is required`)

        const dbInstanceUser = dbInstanceUserEnv

        const dbInstancePassword = process.env[`${dbInstanceUpper}_PASSWORD`]

        const dbInstanceDatabase = process.env[`${dbInstanceUpper}_DATABASE`]

        acc[dbInstance] = {
            host: dbInstanceHost,
            port: dbInstancePort,
            user: dbInstanceUser,
            password: dbInstancePassword,
            database: dbInstanceDatabase,
        }

        return acc
    }, {} as Instances)

    return {
        instances,
    }
}
