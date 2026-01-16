#!/bin/bash

# Production deployment script for AI Research System
set -e

echo "🚀 Starting production deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file based on .env.example"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Generate secret key if not set
if [ -z "$SECRET_KEY" ]; then
    echo "⚠️  SECRET_KEY not set. Generating a new one..."
    export SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
    echo "SECRET_KEY=$SECRET_KEY" >> .env
fi

# Create required directories
mkdir -p staticfiles media logs nginx/ssl

# Build and start services
echo "📦 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo "🔄 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --settings=ai_research_system.settings.production

# Create superuser if needed (optional)
echo "👤 To create a superuser, run:"
echo "docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser --settings=ai_research_system.settings.production"

echo "✅ Deployment complete!"
echo ""
echo "📊 Service URLs:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - Health Check: http://localhost:8000/health/"
echo ""
echo "📝 View logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
