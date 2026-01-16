@echo off
echo ========================================
echo Starting Celery Worker
echo ========================================
echo.
echo This will process background research tasks
echo Keep this window open while using the application
echo.
echo Press Ctrl+C to stop the worker
echo.

celery -A ai_research_system worker --loglevel=info --pool=solo
