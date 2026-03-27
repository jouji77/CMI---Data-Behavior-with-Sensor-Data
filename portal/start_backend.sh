#!/bin/bash
echo "バックエンドのみ起動しています..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000
