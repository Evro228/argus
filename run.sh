#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================================"
echo "👁️  Запуск ARGUS // Tactical Intelligence & Defense"
echo "========================================================"

# Virtualenv check
if [ ! -d ".venv" ]; then
    echo "📦 Инициализация окружения Python..."
    if command -v /Users/slava/.local/bin/uv &> /dev/null; then
        /Users/slava/.local/bin/uv venv .venv
        /Users/slava/.local/bin/uv pip install -r requirements.txt
    elif command -v uv &> /dev/null; then
        uv venv .venv
        uv pip install -r requirements.txt
    else
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
    fi
fi

source .venv/bin/activate

# Open browser on macOS after short delay
(sleep 1.5 && open "http://localhost:8800") &

echo "🚀 Сервер запущен на: http://localhost:8800"
echo "Для остановки нажмите Ctrl+C"

python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8800
