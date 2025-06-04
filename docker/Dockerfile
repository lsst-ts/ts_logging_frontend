FROM node:lts as builder

# Set working directory
WORKDIR /usr/src/app
COPY . .

# Install and cache app dependencies
RUN npm install

# Expose port
EXPOSE 5173

# Run development server in runtime
CMD npx vite --host
