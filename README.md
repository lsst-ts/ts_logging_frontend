# ts_logging_frontend

The frontend of the Rubin Observatory **Nightly Digest**: a dashboard summarising
each observing night from the logging and reporting services. It shows
exposures, time accounting, observing conditions, the observatory's status and
the night's log entries for the Simonyi and AuxTel telescopes.

The data comes from the backend,
[ts_logging_and_reporting](https://github.com/lsst-ts/ts_logging_and_reporting).
The same codebase also builds the **Scientific Nightly Digest**, a public-facing
variant for the scientific community.

It is a React app built with Vite.

## Documentation

- [Getting started](doc/getting-started.md): setting up a development
  environment, running the local stack, and the pull request process.
- [Testing](doc/testing.md): unit tests and the end-to-end suites.
- [Architecture](doc/architecture.md): build-time configuration, images, CI
  and releasing.
- [Scientific Nightly Digest](doc/snd.md): the public variant, its data and
  its deployment.
- [Time accounting](doc/time_accounting.rst): definitions behind the time
  accounting figures.
- [Version history](doc/version_history.rst)
- [Scripts](scripts/README.rst): release and deployment scripts.

## Quick start

With the backend cloned alongside this repository and `docker/.env` configured
as described in [getting started](doc/getting-started.md#3-the-local-stack):

```shell
npm install
pre-commit install
docker compose -f docker/docker-compose.yaml up --build
```

Then open `http://localhost/nightlydigest/`.
