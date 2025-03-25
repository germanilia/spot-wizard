#!/usr/bin/env just --justfile

# List available commands
default:
    @just --list

# Install all dependencies (both backend and frontend)
install: install-backend install-frontend

# Install backend dependencies
install-backend:
    @echo "Installing backend dependencies..."
    pip install -r requirements.txt

# Install frontend dependencies
install-frontend:
    @echo "Installing frontend dependencies..."
    cd frontend && npm install

# Start both frontend and backend servers
start: start-backend start-frontend

# Start backend server
start-backend:
    @echo "Starting backend server..."
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend development server
start-frontend:
    @echo "Starting frontend development server..."
    cd frontend && npm run dev

# Build frontend for production
build-frontend:
    @echo "Building frontend for production..."
    cd frontend && npm run build

# Build Docker image
docker-build:
    @echo "Building Docker image..."
    docker build -t spot-wizard .

# Run Docker container
docker-run:
    @echo "Running Docker container..."
    docker run -p 8000:8000 spot-wizard

# Clean build artifacts
clean:
    @echo "Cleaning build artifacts..."
    rm -rf frontend/dist
    find . -type d -name "__pycache__" -exec rm -rf {} +
    find . -type f -name "*.pyc" -delete

# Run linting for both frontend and backend
lint: lint-frontend lint-backend

# Run frontend linting
lint-frontend:
    @echo "Running frontend linting..."
    cd frontend && npm run lint

# Run backend linting
lint-backend:
    @echo "Running backend linting..."
    flake8 app
    black --check app
    isort --check-only app 