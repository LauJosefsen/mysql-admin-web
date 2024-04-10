This is a small Next.js app for viewing and killing active processes on multiple MariaDB instances.

### Features
- See all active processes, joined with any open transactions.
- Mark long-running open transactions with red.
- Sorted by transaction time desc, then by process time desc.
- Kill a process with two clicks.

### Deployment
TODO: Link to dockerhub

The image requires the following environment variables:
- `DB_INSTANCES` - A comma separated list of MariaDB instances to connect to.

For each instance, the following environment variables are required:
- `{DB_INSTANCE_NAME}_HOST` - The hostname of the MariaDB instance.
- `{DB_INSTANCE_NAME}_PORT` - The port of the MariaDB instance.
- `{DB_INSTANCE_NAME}_USER` - The username to connect to the MariaDB instance.

And optionally
- `{DB_INSTANCE_NAME}_PASSWORD` - The password to connect to the MariaDB instance.
- `{DB_INSTANCE_NAME}_DATABASE` - The database to connect to on the MariaDB instance.

Example environment variables can be found [here](.env).

### Development
To start a dev server, run `bun start dev`
