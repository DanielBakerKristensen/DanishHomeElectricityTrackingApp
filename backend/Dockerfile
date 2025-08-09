# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

# Install system dependencies (if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and group
RUN groupadd -r appuser && useradd --no-log-init -r -g appuser appuser

# Copy only package.json and package-lock.json for dependency installation
COPY --link package.json ./
# If you have a package-lock.json, uncomment the next line
# COPY --link package-lock.json ./

# Install production dependencies using npm ci
RUN --mount=type=cache,target=/root/.npm \
    npm install --production

# Copy application source code (excluding .env and secrets)
COPY --link . .

# Create logs directory for the app
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Expose the backend port
EXPOSE 5000

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Switch to non-root user
USER appuser

# Start the application
CMD ["npm", "start"]
