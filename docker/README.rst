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
   
   If connecting to remote sources such as consdb, exposurelog, narrativelog and nightreport you will need to set an extra environment variable to provide authentication before running the services:
   ::
      export ACCESS_TOKEN=your_authentication_key
   
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
