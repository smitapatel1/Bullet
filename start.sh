#!/bin/bash
set -e

cd /app/backend
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 &

cd /app/frontend

export PORT=${PORT:-10000}

npm start
