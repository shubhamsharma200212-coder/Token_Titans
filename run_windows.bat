@echo off
echo ==========================================================
echo   CareerMatch AI - Windows Setup and FastAPI Launcher
echo ==========================================================

if not exist venv (
    echo [1/3] Creating Python virtual environment...
    python -m venv venv
)

echo [2/3] Activating virtual environment and installing dependencies...
call venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt

if not exist .env (
    copy .env.example .env
    echo Created .env file from .env.example. Add your GEMINI_API_KEY to .env for live AI calls.
)

echo [3/3] Starting FastAPI Server on http://127.0.0.1:8000 ...
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
pause
