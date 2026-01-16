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
   Make sure that the variables are properly configured. For example, set the `FRONTEND_PATH` variable to the absolute path of the frontend source directory:
   ::
      FRONTEND_PATH=/path/to/your/frontend
      BACKEND_PATH=/path/to/your/backend
   
   If connecting to remote sources such as consdb, exposurelog, narrativelog and nightreport you will need to set extra environment variables to access the services and provide authentication before running the services:
   ::
      export ACCESS_TOKEN=your_authentication_key
      export EXTERNAL_INSTANCE_URL=server-url
   
   The token must be manually retrieved from the RSP platform you are connecting to. The scope of the token must be set to at least:

   - `image:read`
   - `exec:internal-tools`

2. **Start Services**:
   From the root of the repository, run the following command to start the services defined in `docker/docker-compose.yaml`:
   ::
      docker-compose -f docker/docker-compose.yaml up --build

   This will:

   - Build the frontend service using the `docker/Dockerfile-dev` file.
   - Expose the frontend on port `5173`.
   - Start the `nginx` service on port `80`.

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

Troubleshooting
===============
- If you encounter issues with missing environment variables, ensure the `.env` file is correctly configured and located in the `docker/` directory.
- For permission issues, try running the commands with `sudo` (Linux/Mac).
- For missing package issues, try pulling a new image and/or pruning existing images.

e.g.
::
      docker pull lsstts/develop-env:develop
      docker system prune

Configuring Additional Credentials
==================================
Some aspects of the Nightly Digest require additional configurations.

**Expected Exposures** (`rubin-sim <https://github.com/lsst/rubin_sim>`_)

This is **not required**; not having these credentials will not break anything, you will just see "0 expected exposures" on the first metric card, and an error in the logs saying that you don't have the credentials. You should **only set these credentials if you are actively working on this aspect of the Nightly Digest**.

1. **Get AWS Credentials**:
   Open an RSP notebook and copy **ONLY** the [default] profile contents of your aws credentials file.
   **DO NOT** copy the other profiles. The [embargo] profile especially is very critical and should be left alone.
   ::
      cat ~/.lsst/aws-credentials.ini

2. **Create Local Credentials File**:
   Put the credentials in a safe place on your computer, e.g.:
   ::
      nano ~/.aws/credentials

   **Please note:**

   - Be really careful to put the credentials file in a safe place.
   - Make sure to not push it to GitHub. If you do, then this needs to be reported immediately, as it represents a high-risk security issue. GitHub history is preserved (and public) even if you do delete the commit.
   - The file should have reduced access permissions.
   e.g.
   ::
      chmod 600 path/to/credentials


3. **Tell Docker Where Credentials Are**:
   In your `docker-compose.yaml`, indicate in the volume section where your credentials file is located, e.g.:
   ::
      backend:
         volumes:
            - ~/.aws:/home/saluser/.aws:ro

   The file location goes on the left side, before the first colon ( : ).