##########################
Running with Docker Compose
##########################

This project includes a `docker-compose.yaml` file to simplify running the frontend (and optionally other services) in a containerized environment.

Prerequisites
=============
Before running the project with Docker Compose, ensure you have the following installed:

- `Docker` (https://www.docker.com/)
- `Docker Compose` (https://docs.docker.com/compose/)

Steps to Run
============
1. **Set Environment Variables**:
   Create a `.env` file in the `docker/` directory and copy environment variables from the example env file `docker/example_env` to the new file. 
   Make sure that the variables are properly configured. These are read by Docker Compose itself:

   - `FRONTEND_PATH` and `BACKEND_PATH`: paths to the frontend and backend repositories, relative to `docker/` or absolute.
   - `LOCAL_RUBIN_SIM_DATA_DIR`: a local copy of the `rubin_sim` data, mounted read-only into the backend containers.
   - `REDIS_MAX_MEMORY` (optional, default `512mb`): the redis cache's memory ceiling.

   The backend also needs its upstream credentials in `.env`: `ACCESS_TOKEN`, `EXTERNAL_INSTANCE_URL`, `JIRA_API_TOKEN`, `JIRA_API_HOSTNAME` and `ZEPHYR_API_TOKEN`.
   How to obtain each one, and every other variable the backend reads, is described in the backend's `environment variables documentation`_.

   .. _environment variables documentation: https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/environment-variables.md

2. **Start Services**:
   From the root of the repository, run the following command to start the services defined in `docker/docker-compose.yaml`:
   ::
      docker-compose -f docker/docker-compose.yaml up --build

   This will:

   - Build the frontend and backend images, each from its repository's `docker/Dockerfile`.
   - Start the frontend dev server on port `5173`.
   - Start the backend API on port `8080`, the backend refresh worker, and `redis` on port `6379`.
   - Start the `nginx` service on port `80`, which serves the frontend and proxies `/nightlydigest/api/` to the backend.

3. **Access the Application**:
   Access the Frontend application through the Nginx service at: `http://localhost/nightlydigest/`.

4. **Stop Services**:
   To stop the running containers, press `Ctrl+C` in the terminal where `docker-compose` is running. Alternatively, you can run:
   ::
      docker-compose -f docker/docker-compose.yaml down

Optional Configuration
======================
- **Modify Ports**:
  If you need to change the exposed ports, update the `ports` section in `docker/docker-compose.yaml`.

- **Point the Frontend at a Different Backend**:
  By default the frontend derives the backend API root from the origin of the page it is served from, i.e. requests go to `/nightlydigest/api` on the same host, which nginx proxies to the backend container. To target a backend somewhere else, set `VITE_BACKEND_URL` to the full API root:
  ::
     VITE_BACKEND_URL=https://your-rsp-host.example.org/nightlydigest/api

  Leave it blank (or omit it) to keep the default behaviour. Include the `/nightlydigest/api` path; the value is used as-is, so it should not have a trailing slash.

  This value is read by Vite when the frontend starts or is built, not by the browser at runtime, so it must be set before the frontend comes up:

  - For the Docker Compose dev stack, put it in `docker/.env`. The `frontend` service passes it through to the Vite dev server, so a `docker-compose up` restart is enough to apply a change.
  - For the deployment image (`docker/Dockerfile-deploy`), pass it as a build argument, since the bundle is built into the image:
    ::
       docker build -f docker/Dockerfile-deploy --build-arg VITE_BACKEND_URL=https://your-rsp-host.example.org/nightlydigest/api .

    Changing it requires rebuilding the image.

- **Build the Scientific Nightly Digest**:
  The Scientific Nightly Digest (SND) is a public-facing variant of this app for the scientific community, deployed separately and served from static files rather than the FastAPI backend. Set `VITE_SCIENTIFIC_NIGHTLY_DIGEST` to switch a build into that mode:
  ::
     VITE_SCIENTIFIC_NIGHTLY_DIGEST=true

  Accepted affirmative values are `true`, `1`, `yes` and `on`; anything else (including leaving it blank or omitting it) builds the internal Nightly Digest.

  Like `VITE_BACKEND_URL`, it is read by Vite at start/build time rather than by the browser, so set it in `docker/.env` for the Compose dev stack, or pass it as a build argument for the deployment image:
  ::
     docker build -f docker/Dockerfile-deploy --build-arg VITE_SCIENTIFIC_NIGHTLY_DIGEST=true .

  The flag also sets where the app is served from: the Scientific Nightly Digest lives at the domain root (`/`) instead of `/nightlydigest/`. When running in local development, you must also set
  `VITE_BACKEND_URL` appropriately.
  ::
     VITE_BACKEND_URL=http://localhost/nightlydigest/api

- **Disable Caching**:
  API responses are cached twice: by the nginx proxy, and by the backend in redis. Either layer can be turned off from the `.env` file, which is useful when you want to see uncached upstream behaviour:
  ::
     ND_CACHING_DISABLE_NGINX=1
     ND_CACHING_DISABLE_REDIS=1

  A missing, empty or `0` value leaves the layer enabled.

  With `ND_CACHING_DISABLE_NGINX` set, the proxy also replaces the upstream `Cache-Control` header with `no-store`, so the browser will not serve an API response from its own cache either.

  `example_env` also sets `ND_CACHING_DISABLE_WORKER=1`, which turns off the refresh worker that keeps today's redis entries warm. `ND_CACHING_DISABLE_REDIS` and `ND_CACHING_DISABLE_WORKER` are backend variables; see the backend's `environment variables documentation`_.

- **Backend Development Mode**:
  `example_env` sets `ND_DEBUG=1`, placing the backend in development mode. Leave it set for local development; the backend's `environment variables documentation`_ describes what it changes.

Troubleshooting
===============
- If you encounter issues with missing environment variables, ensure the `.env` file is correctly configured and located in the `docker/` directory.
- For permission issues, try running the commands with `sudo` (Linux/Mac).
- For missing package issues, try pulling a new image and/or pruning existing images.

e.g.
::
      docker pull lsstts/develop-env:develop
      docker system prune

Expected Exposures Credentials
==============================
Expected exposures need AWS credentials, which are **not required** otherwise: without them you will see "0 expected exposures" on the first metric card and an error in the backend logs. Only set them up if you are working on that feature.

**These credentials are sensitive, and leaking them is a high-risk security incident.** Copy **ONLY** the `[default]` profile; **DO NOT** copy any other profile, and especially not `[embargo]`. Never commit the file: if it is ever pushed to GitHub, report it immediately, since Git history is preserved, and public, even after the commit is deleted.

Obtain them by following the steps in the backend's `environment variables documentation`_, and save the file as `~/.aws/credentials`. `docker-compose.yaml` mounts `~/.aws` read-only into the backend containers.
