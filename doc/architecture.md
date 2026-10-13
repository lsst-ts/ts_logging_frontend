# Architecture

This document covers how the frontend is built, configured and deployed. The
deployment as a whole (the backend, redis, nginx and their configuration in
Phalanx) is described in the backend's
[deployment guide](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/deployment.md),
and releases in its
[release process](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/release-process.md).

---

## 1. Overview

The frontend is a static single-page app. Each deployment's nginx serves it
under `/nightlydigest/` and proxies `/nightlydigest/api/` to the backend, so the
browser talks to one origin for both.

The frontend has no server of its own. In Kubernetes, an init container copies
the built files out of the frontend image into nginx's static store, and nginx
serves them from there. Locally, the Docker Compose stack runs the Vite dev
server behind the same nginx paths instead (see
[getting started](getting-started.md#3-the-local-stack)).

---

## 2. Build-time configuration

Vite resolves these when the app is built, or when the dev server starts. A
built bundle cannot be reconfigured afterwards.

| Variable | Effect |
|---|---|
| `VITE_SCIENTIFIC_NIGHTLY_DIGEST` | Builds the Scientific Nightly Digest instead of the internal app, and serves it from `/` instead of `/nightlydigest/`. Accepts `true`, `1`, `yes` or `on`. See [the SND guide](snd.md). |
| `VITE_BACKEND_URL` | Overrides the backend API root, e.g. `https://example.org/nightlydigest/api`, with no trailing slash. |

Without `VITE_BACKEND_URL`, the API root is the page's origin plus the base
path plus `api`, i.e. `/nightlydigest/api` on the same host. This is what every
Phalanx deployment uses.

The base path comes from `vite.config.js`, and app code reads it as
`import.meta.env.BASE_URL` rather than hardcoding `/nightlydigest/`.

---

## 3. Container Images

| Image | Built by | From | Used by |
|---|---|---|---|
| `rubincr.lsst.org/nightlydigest-frontend:develop` | Jenkins, with `docker/Dockerfile-deploy` | Every push to `develop` or `alpha-release` | Development environments |
| `ts-dockerhub.lsst.org/nightlydigest-frontend:<cycle revision>` | [ts_cycle_build](https://github.com/lsst-ts/ts_cycle_build), with its own Dockerfile | A release tag | Production environments |
| `nightlydigest-frontend-local` | Docker Compose, with `docker/Dockerfile` | The working copy | The local stack |

Note that:

- `develop` and `alpha-release` push the same tag, so a development environment
  runs whichever branch was built last.
- Production images are built by ts_cycle_build, not from this repository's
  Dockerfiles, so changes to `docker/Dockerfile-deploy` only affect the
  `develop` image.
- `Dockerfile-deploy` sets the version in `package.json` to `develop`. The
  sidebar shows the version and links to the matching
  `doc/version_history.rst` on GitHub: at the `v<version>` tag for a release, or
  on the `develop` branch otherwise.

---

## 4. CI

Jenkins (`Jenkinsfile`) runs on every branch and pull request:

1. pre-commit on all files, then the unit tests.
2. The mocked end-to-end tests ([testing.md](testing.md)).
3. On `develop` and `alpha-release` only: builds the `develop` image and pushes
   it to `rubincr.lsst.org`.

GitHub Actions additionally checks that each pull request adds a news fragment,
and that `main` has not been merged into it.

---

## 5. Releasing

Releases follow the backend's
[release process](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/release-process.md).
The frontend-specific step is running, on `main`:

```shell
python scripts/make_release.py -v <version>
```

with the version number without the `v` prefix. It builds the release notes
from the news fragments with towncrier, sets `version` and `lastUpdated` in
`package.json`, commits both, and creates the `v<version>` tag. See
[scripts/README.rst](../scripts/README.rst) for its options.
