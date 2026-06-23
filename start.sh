#!/bin/bash
set -e

export PATH="/opt/venv/bin:$PATH"

cd /app/backend

uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 &

cd /app/frontend

export PORT=${PORT:-10000}

npm start
