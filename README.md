# Spot Wizard

A web application for analyzing AWS Spot instances and providing recommendations for optimal instance allocation.

## Features

- View and analyze AWS Spot instance data
- Get recommendations for optimal instance types and regions
- Compare spot vs on-demand pricing
- Analyze interruption rates and availability

## Tech Stack

- Frontend: React + TypeScript + Vite + shadcn/ui + Valtio
- Backend: FastAPI + Python
- Styling: Tailwind CSS

## Development Setup

1. Install dependencies:

```bash
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
```

2. Start the development servers:

```bash
# Start the backend server (from root directory)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start the frontend development server (from frontend directory)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## Docker Deployment

The application can be deployed using Docker. The Dockerfile creates a single container that runs both the frontend and backend.

### Building and Running with Docker

Using Just commands:
```bash
# Build the Docker image
just docker-build

# Run the container
just docker-run
```

Or using Docker directly:
```bash
# Build the Docker image
docker build -t spot-wizard .

# Run the container
docker run -p 8000:8000 spot-wizard
```

The application will be available at http://localhost:8000 when running in Docker.

### Docker Features

- Multi-stage build for optimized image size
- Production-ready configuration
- Frontend console logs disabled in production
- Single container deployment
- FastAPI serving both the API and static frontend files

## Debugging

The project includes VS Code launch configurations for debugging both frontend and backend:

1. Open the project in VS Code
2. Go to the Run and Debug view (Ctrl+Shift+D)
3. Select "Full Stack: Frontend + Backend" from the dropdown
4. Press F5 or click the green play button

This will start both the frontend and backend servers in debug mode.

## Project Structure

```
.
├── app/                    # Backend FastAPI application
│   ├── main.py            # Main FastAPI application
│   └── models/            # Pydantic models
├── frontend/              # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   ├── store/        # Valtio store
│   │   ├── types/        # TypeScript types
│   │   ├── App.tsx       # Main App component
│   │   └── main.tsx      # Application entry point
│   └── package.json      # Frontend dependencies
├── requirements.txt       # Backend dependencies
├── Dockerfile            # Docker configuration
└── README.md             # This file
``` 