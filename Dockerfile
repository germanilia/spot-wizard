# Build stage for React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ .

# Build the frontend with production settings
ENV NODE_ENV=production
RUN npm run build

# Python backend stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project structure
COPY . .

# Remove any cached Python files
RUN find . -type f -name "*.pyc" -delete && \
    find . -type d -name "__pycache__" -delete

# Create necessary directories
RUN mkdir -p /app/static /app/data && \
    chmod -R 777 /app/data && \
    chmod -R 755 /app/static

# Copy built frontend from the frontend-build stage
COPY --from=frontend-build /app/frontend/dist/ /app/static/

# Create a volume for the cache
VOLUME /app/data

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV APP_ENV=production

# Expose the port the app runs on
EXPOSE 8000

# Copy and set up the entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
