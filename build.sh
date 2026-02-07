#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Create start script
cat > start.sh << 'EOF'
#!/bin/bash
# Start Celery worker in background
celery -A ai_research_system worker -l info --concurrency 2 &
# Start Gunicorn
exec gunicorn ai_research_system.wsgi:application --bind 0.0.0.0:$PORT
EOF
chmod +x start.sh
