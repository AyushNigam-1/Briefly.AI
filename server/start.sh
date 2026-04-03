#!/bin/bash

echo "🎙️ Starting LiveKit Voice Worker in the background..."
# We use 'start' so it runs in production mode instead of dev mode
python voice_worker.py start &

echo "🚀 Starting FastAPI Server..."
uvicorn app:app --host 0.0.0.0 --port 7860