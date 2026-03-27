#!/bin/bash
echo "遠心圧縮機ポータルを起動しています..."
cd "$(dirname "$0")"

# Start backend
cd backend
echo "バックエンドの依存関係をインストール中..."
pip install -r requirements.txt -q
echo "バックエンドを起動しています..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "バックエンドが起動しました (PID: $BACKEND_PID)"

# Start frontend
cd ../frontend
echo "フロントエンドの依存関係をインストール中..."
npm install --silent
echo "フロントエンドを起動しています..."
npm run dev &
FRONTEND_PID=$!
echo "フロントエンドが起動しました (PID: $FRONTEND_PID)"

echo ""
echo "======================================"
echo "  遠心圧縮機ポータル 起動完了"
echo "======================================"
echo "  ポータル:     http://localhost:5173"
echo "  API ドキュメ: http://localhost:8000/docs"
echo "======================================"
echo ""
echo "終了するには Ctrl+C を押してください"

cleanup() {
    echo ""
    echo "シャットダウン中..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
