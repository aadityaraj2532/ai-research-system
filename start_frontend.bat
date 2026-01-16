@echo off
echo ========================================
echo Starting Frontend (Next.js)
echo ========================================
echo.

cd frontend

echo Installing Node.js dependencies...
call npm install

echo.
echo Starting Next.js development server...
echo Frontend will be available at http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
