# Production Deployment Guide

This guide covers deploying the AI Research System to production using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Domain name (for HTTPS)
- SSL certificates (for HTTPS)

## Quick Start

### 1. Environment Setup

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```bash
# Django
SECRET_KEY=your-super-secret-key-here  # Generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DB_NAME=ai_research_db
DB_USER=ai_research_user
DB_PASSWORD=strong-database-password

# API Keys
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key
LANGCHAIN_API_KEY=your-langchain-api-key

# Security (for HTTPS)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### 2. Deploy with Docker Compose

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

Or manually:

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --settings=ai_research_system.settings.production

# Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser --settings=ai_research_system.settings.production
```

### 3. Verify Deployment

Check service health:

```bash
# Health check
curl http://localhost:8000/health/

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Architecture

The production setup consists of:

- **Nginx**: Reverse proxy and static file server
- **Backend**: Django application (Gunicorn)
- **Frontend**: Next.js application
- **PostgreSQL**: Database
- **Redis**: Cache and Celery broker
- **Celery Worker**: Background task processor
- **Celery Beat**: Scheduled task scheduler

## SSL/HTTPS Setup

### Option 1: Let's Encrypt with Certbot

1. Install Certbot:

```bash
sudo apt-get update
sudo apt-get install certbot
```

2. Generate certificates:

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

3. Update `nginx.conf` to use SSL certificates (add SSL server block)

4. Update `.env` with HTTPS settings

### Option 2: Manual SSL Certificates

1. Place certificates in `nginx/ssl/`:
   - `cert.pem` (certificate)
   - `key.pem` (private key)

2. Update `nginx.conf` to reference SSL certificates

## Maintenance

### Backups

Run automated backups:

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

Backups include:
- PostgreSQL database dump
- Media files
- Redis data (if persistent)

### Logs

View logs:

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f celery
```

Logs are also stored in `./logs/` directory.

### Updates

To update the application:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --settings=ai_research_system.settings.production
```

### Database Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --settings=ai_research_system.settings.production
```

### Creating Admin User

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser --settings=ai_research_system.settings.production
```

## Monitoring

### Health Checks

- **Health**: `http://yourdomain.com/health/` - Full health check
- **Readiness**: `http://yourdomain.com/ready/` - Service readiness
- **Liveness**: `http://yourdomain.com/live/` - Service liveness

### Metrics

Monitor key metrics:

- CPU/Memory usage: `docker stats`
- Database connections: Check PostgreSQL logs
- Celery tasks: Monitor Redis queue length
- API response times: Check Nginx access logs

## Troubleshooting

### Services won't start

1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify environment variables: Check `.env` file
3. Check port conflicts: `netstat -tulpn | grep :80`

### Database connection errors

1. Verify database credentials in `.env`
2. Check database container: `docker-compose -f docker-compose.prod.yml ps db`
3. Check database logs: `docker-compose -f docker-compose.prod.yml logs db`

### Static files not loading

1. Collect static files: `docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput --settings=ai_research_system.settings.production`
2. Check Nginx configuration
3. Verify file permissions

### Celery tasks not running

1. Check Celery worker logs: `docker-compose -f docker-compose.prod.yml logs celery`
2. Verify Redis connection
3. Check task queue in Redis: `docker-compose -f docker-compose.prod.yml exec redis redis-cli LLEN celery`

## Security Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Use strong database passwords
- [ ] Enable HTTPS (`SECURE_SSL_REDIRECT=True`)
- [ ] Configure `ALLOWED_HOSTS` correctly
- [ ] Set `CSRF_TRUSTED_ORIGINS` for your domain
- [ ] Enable Redis password (if exposed)
- [ ] Regular backups configured
- [ ] Firewall rules configured
- [ ] Rate limiting enabled (Nginx)
- [ ] Security headers configured (Nginx)

## Performance Tuning

### Gunicorn Workers

Adjust worker count in `docker-compose.prod.yml`:

```yaml
command: gunicorn --workers 4 --threads 2 ...
```

Formula: `(2 × CPU cores) + 1`

### Database Connection Pooling

Already configured in `production.py`:
- `CONN_MAX_AGE = 600` (10 minutes)

### Redis Cache

Configured for:
- Session storage
- General caching
- Celery broker/result backend

### Nginx Caching

Static files cached for 30 days, media files for 7 days.

## Scaling

To scale services horizontally:

```bash
# Scale Celery workers
docker-compose -f docker-compose.prod.yml up -d --scale celery=3

# Scale backend (requires load balancer)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Support

For issues or questions:
- Check logs first
- Review this documentation
- Check Django/Next.js/Docker documentation
