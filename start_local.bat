@echo off
echo ========================================
echo AI Research System - Local Startup
echo ========================================
echo.

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

echo.
echo Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting Backend (Django)
echo ========================================
echo.

echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Running database migrations...
python manage.py migrate

echo.
echo Creating cache table...
python manage.py createcachetable

echo.
echo ========================================
echo Backend is ready!
echo ========================================
echo.
echo Starting Django server on http://localhost:8000
echo.
echo To start the frontend, open a new terminal and run:
echo   cd frontend
echo   npm install
echo   npm run dev
echo.
echo Press Ctrl+C to stop the server
echo.

python manage.py runserver
