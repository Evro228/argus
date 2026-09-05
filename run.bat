@echo off
chcp 65001 > nul
title CyberSec & OSINT Studio
echo ========================================================
echo 🛡️  Запуск CyberSec & OSINT Studio (Windows)
echo ========================================================

if not exist ".venv" (
    echo [INFO] Создание виртуального окружения Python...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

echo [OK] Запуск веб-сервера...
start http://localhost:8800
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8800 --reload
pause
