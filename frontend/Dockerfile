# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:lts-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Create a non-root user and group that Nginx will run as
RUN addgroup -S appgroup && adduser -S -G appgroup appuser

# Create all directories Nginx needs to write to at runtime and set ownership
# This includes PID files, cache, and any temp directories from nginx.conf
# Create directories and files Nginx needs to write to at runtime
RUN mkdir -p /var/cache/nginx /var/tmp/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /var/tmp/nginx && \
    chown appuser:appgroup /var/run/nginx.pid

# Copy the built assets from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install curl for health checks
RUN apk add --no-cache curl

# Switch to the non-root user before starting the server
USER appuser

# Expose port 80 for the Nginx server
EXPOSE 80

# This health check ensures the Nginx server is responding to requests.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start Nginx as the new user
CMD ["nginx", "-g", "daemon off;"]
