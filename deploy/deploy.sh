#!/bin/bash

# AI Research System Deployment Script
# This script deploys the AI Research System to a production server

set -e

# Configuration
PROJECT_NAME="ai_research_system"
PROJECT_DIR="/var/www/$PROJECT_NAME"
VENV_DIR="$PROJECT_DIR/venv"
USER="www-data"
GROUP="www-data"

echo "🚀 Starting deployment of AI Research System..."

# Create project directory
echo "📁 Creating project directory..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$GROUP $PROJECT_DIR

# Create log directories
echo "📝 Creating log directories..."
sudo mkdir -p /var/log/$PROJECT_NAME
sudo mkdir -p /var/log/celery
sudo mkdir -p /var/run/celery
sudo chown $USER:$GROUP /var/log/$PROJECT_NAME
sudo chown $USER:$GROUP /var/log/celery
sudo chown $USER:$GROUP /var/run/celery

# Copy project files
echo "📋 Copying project files..."
sudo cp -r . $PROJECT_DIR/
sudo chown -R $USER:$GROUP $PROJECT_DIR

# Create virtual environment
echo "🐍 Creating virtual environment..."
cd $PROJECT_DIR
sudo -u $USER python3 -m venv $VENV_DIR
sudo -u $USER $VENV_DIR/bin/pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
sudo -u $USER $VENV_DIR/bin/pip install -r requirements-production.txt

# Copy environment file
echo "⚙️ Setting up environment..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    sudo cp .env.production.example $PROJECT_DIR/.env
    echo "⚠️  Please edit $PROJECT_DIR/.env with your production settings"
fi

# Collect static files
echo "🎨 Collecting static files..."
sudo -u $USER $VENV_DIR/bin/python manage.py collectstatic --noinput --settings=ai_research_system.settings.production

# Run migrations
echo "🗄️ Running database migrations..."
sudo -u $USER $VENV_DIR/bin/python manage.py migrate --settings=ai_research_system.settings.production

# Install systemd services
echo "🔧 Installing systemd services..."
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo cp deploy/systemd/*.socket /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start services
echo "🚀 Starting services..."
sudo systemctl enable ai-research-system.socket
sudo systemctl enable ai-research-system.service
sudo systemctl enable ai-research-celery.service

sudo systemctl start ai-research-system.socket
sudo systemctl start ai-research-system.service
sudo systemctl start ai-research-celery.service

# Install nginx configuration (if nginx is installed)
if command -v nginx &> /dev/null; then
    echo "🌐 Installing nginx configuration..."
    sudo cp deploy/nginx.conf /etc/nginx/sites-available/$PROJECT_NAME
    sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit $PROJECT_DIR/.env with your production settings"
echo "2. Configure your SSL certificates in nginx"
echo "3. Update domain names in nginx configuration"
echo "4. Create a superuser: sudo -u $USER $VENV_DIR/bin/python $PROJECT_DIR/manage.py createsuperuser --settings=ai_research_system.settings.production"
echo "5. Test the deployment: curl -I http://localhost/api/"
echo ""
echo "🔍 Service status:"
sudo systemctl status ai-research-system.service --no-pager -l
sudo systemctl status ai-research-celery.service --no-pager -l