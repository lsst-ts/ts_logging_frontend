FROM rubincr.lsst.org/develop-env-node:develop

# Set working directory
WORKDIR /usr/src/app
COPY --chown=saluser:saluser . .

# We install wget used for docker compose health checks
USER root
RUN dnf install -y gcc libatomic wget
USER saluser

# Install and cache app dependencies
RUN npm install

# Expose port
EXPOSE 5173

# Run development server in runtime
CMD npx vite --host
