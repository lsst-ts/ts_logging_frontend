# Getting started

This document covers setting up a development environment for the frontend,
running the full Nightly Digest stack locally, and the process for getting a
change merged.

---

## 1. Prerequisites

- [Node.js](https://nodejs.org/), current LTS. The development image uses
  `node:lts`.
- Docker with Compose.
- [pre-commit](https://pre-commit.com/). If you have set up the backend's
  conda environment, it already includes pre-commit.
- This repository and
  [ts_logging_and_reporting](https://github.com/lsst-ts/ts_logging_and_reporting)
  (the backend) cloned side by side. The local stack is defined in this
  repository, and `docker/example_env` assumes the two repositories are siblings.
- An account on the RSP deployment you want to read data from, most likely
  [usdf-rsp-dev](https://usdf-rsp-dev.slac.stanford.edu/).

---

## 2. Install

From the root of this repository:

```shell
npm install
pre-commit install
```

`pre-commit install` adds a git hook that runs YAML checks, prettier and eslint
on the files in each commit. To run the hooks against the whole repository:

```shell
pre-commit run --all-files
```

---

## 3. The local stack

The frontend only renders data the backend serves, so development normally
happens against the whole application running under Docker Compose:

| Service | Purpose | Port |
|---|---|---|
| `frontend` | The Vite dev server, built from `docker/Dockerfile` | 5173 |
| `backend` | The backend API, built from the backend repository's `docker/Dockerfile` | 8080 |
| `refresh-worker` | Keeps today's backend cache entries warm | — |
| `redis` | The backend cache | 6379 |
| `nginx` | Serves the frontend and proxies `/nightlydigest/api/` to the backend, caching responses | 80 |

### Configure

Copy `docker/example_env` to `docker/.env` and fill it in:

| Variable | Purpose |
|---|---|
| `FRONTEND_PATH`, `BACKEND_PATH` | Paths to the two repositories, relative to `docker/` or absolute. The defaults work when the repositories are siblings. |
| `LOCAL_RUBIN_SIM_DATA_DIR` | A local copy of the `rubin_sim` data, mounted read-only into the backend containers. |
| `ACCESS_TOKEN`, `EXTERNAL_INSTANCE_URL`, `JIRA_API_TOKEN`, `JIRA_API_HOSTNAME`, `ZEPHYR_API_TOKEN` | The backend's upstream credentials. |

The backend's
[getting started guide](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/getting-started.md)
explains how to obtain each credential and download the `rubin_sim` data. Its
[environment variables reference](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/environment-variables.md)
lists every variable the backend reads.

Leave `ND_DEBUG=1` set, as the example does. It puts the backend in development
mode, which enables auto-reload and turns some production startup failures into warnings.

### Run

From the root of this repository:

```shell
docker compose -f docker/docker-compose.yaml up [--build]
```

| URL | What |
|---|---|
| `http://localhost/nightlydigest/` | The application |
| `http://localhost/nightlydigest/api/docs` | The backend's interactive API reference |
| `http://localhost:8080/<endpoint>` | The backend directly, bypassing the nginx cache |

Press `Ctrl+C` to stop the stack, or run
`docker compose -f docker/docker-compose.yaml down`.

### Working on the frontend

- **Source changes** take effect immediately. The `frontend` container
  bind-mounts this repository, and Vite hot-reloads changed modules.
- **Dependency changes** (`package.json` or `package-lock.json`) need the
  container recreated. `node_modules` inside the container is an anonymous
  volume, populated when the container is first created and reused after that,
  so `--build` alone still leaves the old packages in place. Recreate it with:

  ```shell
  docker compose -f docker/docker-compose.yaml up --build --renew-anon-volumes frontend
  ```

- **`VITE_*` variables** are read when the Vite server starts. After changing one
  in `docker/.env`, run `docker compose ... up` again so the container is
  recreated with the new value.

### Running the Scientific Nightly Digest

The Scientific Nightly Digest (SND) is a public-facing variant of the app,
built from this repository with `VITE_SCIENTIFIC_NIGHTLY_DIGEST` set. To run it
locally, set both of these in `docker/.env`:

```shell
VITE_SCIENTIFIC_NIGHTLY_DIGEST=true
VITE_BACKEND_URL=http://localhost/nightlydigest/api
```

The SND is served from the domain root, so open `http://localhost/`. The
backend URL has to be set explicitly because the API path no longer follows
from the page's base path.

Note that in production mode, the SND does not use the FastAPI backend, instead
serving pre-generated static files.

### Caching

API responses are cached twice: by nginx, and by the backend in redis. To see
uncached upstream behaviour, turn either layer off in `docker/.env`:

```shell
ND_CACHING_DISABLE_NGINX=1
ND_CACHING_DISABLE_REDIS=1
```

A missing, empty or `0` value leaves the layer on. Disabling the nginx cache
also sends `Cache-Control: no-store`, so the browser does not cache responses
either.

`example_env` sets `ND_CACHING_DISABLE_WORKER=1`, which turns off the refresh
worker. Leave it set unless you are working on the RefreshWorker to reduce
upstream load.

To clear the nginx cache without disabling it or restarting containers:

```shell
docker exec nightlydigest-nginx sh -c 'rm -rf /var/cache/nginx/nightlydigest/*'
```

### Expected exposures

The "expected exposures" figure on the Digest page needs AWS credentials. These
are **not required** for anything else: without them the first metric card
shows 0 expected exposures and the backend logs an error. Only set them up if
you are working on that feature.

> [!CAUTION]
> These credentials are sensitive, and leaking them is a high-risk security
> incident. Copy **only** the `[default]` profile, and never the `[embargo]`
> profile. Never commit the file. If it is ever pushed to GitHub, report it
> immediately: the commit stays in Git history, and public, even after it is
> deleted.

Obtain them by following the backend's
[environment variables reference](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/environment-variables.md),
and save the file as `~/.aws/credentials`. The backend containers mount `~/.aws`
read-only.

### Troubleshooting

- **Missing environment variables:** check that the file is `docker/.env`, not in
  the repository root.
- **Permission denied on the Docker socket (Linux):** add your user to the
  `docker` group, or run Docker commands with `sudo`.
- **The backend image fails to build with missing packages:** pull a fresh base
  image and prune old ones:

  ```shell
  docker system prune
  docker pull lsstts/develop-env:develop
  ```

---

## 4. Tooling

- The app is React 19 built with Vite. Routing uses
  [TanStack Router](https://tanstack.com/router), with search parameters
  validated by zod in `src/routes.js`.
- Imports use the `@/` alias for `src/`.
- Styling uses [Tailwind CSS](https://tailwindcss.com/) v4. Theme variables and
  global styles live in `src/index.css`.
- UI primitives come from [shadcn/ui](https://ui.shadcn.com/), configured in
  `components.json` at the repository root. Add a component with
  `npx shadcn@latest add <component>`; it is generated into
  `src/components/ui/`.

---

## 5. Making a change

The project follows the
[TSSW development workflow](https://tssw-developer.lsst.io/work_management/development_workflow.html).

1. Branch from `develop` as `tickets/<JIRA TICKET>`, for example
   `tickets/SSW-1234`.
2. Add a news fragment describing the change for the release notes; see
   [news/README.rst](news/README.rst). Changes are recorded per ticket, so a
   ticket with several changes can have several fragments.
3. Open a pull request against `develop`. Open it as a draft until it is ready
   for review.
4. Checks that must pass:
   - **Jenkins:** pre-commit on all files, the unit tests, and the mocked e2e
     suite. See [testing.md](testing.md).
   - **ChangelogUpdated** (GitHub Actions): fails if the branch adds no news
     fragment.
   - **Rebase checker** (GitHub Actions): fails if `main` has been merged into
     the branch. Rebase on `develop` instead of merging `main`.

Each merge to `develop` builds and pushes the
`rubincr.lsst.org/nightlydigest-frontend:develop` image. Releases and
deployments are shared with the backend and described in its
[release process](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/release-process.md).
