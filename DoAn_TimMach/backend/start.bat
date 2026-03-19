@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   CardioPredict AI - Backend API
echo   Entry point: api.py (port 5001)
echo ============================================
echo.

REM Kiểm tra Python đã cài chưa
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Python. Hay cai Python 3.9+ truoc.
    pause
    exit /b 1
)

REM Kiểm tra các thư viện cần thiết
echo [INFO] Kiem tra thu vien...
python -c "import flask, flask_cors, waitress, joblib" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Cai dat thu vien tu requirements.txt...
    pip install -r requirements.txt
)

echo.
echo [INFO] Khoi dong API Backend...
echo [INFO] API se chay tai: http://127.0.0.1:5001
echo [INFO] Nhan CTRL+C de dung server.
echo.
python api.py
pause
