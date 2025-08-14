# Stage 1: Build the SolidJS application
# Using a Node.js image to compile the SolidJS project.
FROM node:22-alpine AS builder

# Set the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to leverage Docker cache.
# This step is done separately to ensure npm install is only re-run if dependencies change.
COPY package*.json ./

# Install project dependencies.
RUN npm install

# Copy the rest of your application code.
COPY . .

# Build the SolidJS application.
# The default build output for SolidJS (with Vite) is typically 'dist'.
# Ensure your build command outputs to a directory named 'dist'.
RUN npm run build

# Stage 2: Serve the SolidJS application with Caddy
# Using the official Caddy image, which is optimized for serving static files.
FROM caddy:latest-alpine

# Set the working directory to Caddy's default www root.
WORKDIR /usr/share/caddy

# Remove default Caddyfile if it exists, as we'll provide our own.
# This prevents potential conflicts.
RUN rm -f /etc/caddy/Caddyfile

# Copy the Caddyfile from your project to the Caddy configuration directory.
# This file defines how Caddy will serve your SolidJS application.
COPY Caddyfile /etc/caddy/Caddyfile

# Copy the built SolidJS application from the 'builder' stage into Caddy's web root.
# The 'dist' directory contains all the static files for your SPA.
COPY --from=builder /app/dist/. ./

# Expose port 80, which is where Caddy will listen for incoming HTTP requests by default.
# Caddy can automatically handle HTTPS on port 443 if configured with a public domain.
EXPOSE 8080

# The default CMD for the caddy image is 'caddy run --config /etc/caddy/Caddyfile --adapter caddyfile',
# which will start Caddy and serve your application based on the provided Caddyfile.
