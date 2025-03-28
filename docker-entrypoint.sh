#!/bin/bash
set -e

# Default to production if no environment is specified
APP_ENV=${APP_ENV:-production}

if [ "$APP_ENV" = "production" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
elif [ "$APP_ENV" = "development" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Unknown environment: $APP_ENV"
    exit 1
fi
