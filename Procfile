web: gunicorn ai_research_system.wsgi:application --log-file -
worker: celery -A ai_research_system worker -l info
