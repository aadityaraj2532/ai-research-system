# AI Research System - Production Deployment Guide

## Overview

This guide covers deploying the AI Research System to a production environment with proper security, monitoring, and performance configurations.

## Production Features

✅ **Security Hardening**
- HTTPS enforcement (configurable)
- Security headers (XSS, CSRF, HSTS)
- Secure session and cookie settings
- Rate limiting for API endpoints

✅ **Database Configuration**
- PostgreSQL support with connection pooling
- SQLite fallback for testing
- Database SSL configuration

✅ **Caching & Performance**
- Redis cache backend with fallback to database cache
- Session storage optimization
- Static file serving with WhiteNoise

✅ **Monitoring & Health Checks**
- Health check endpoints (`/health/`, `/ready/`, `/live/`)
- Structured JSON logging
- Error reporting via email
- Sentry integration support

✅ **Deployment Automation**
- Automated deployment script
- Systemd service configuration
- Nginx reverse proxy setup
- Celery worker management

## Quick Start

### 1. Prerequisites

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-venv python3-pip postgresql postgresql-contrib redis-server nginx

# CentOS/RHEL
sudo yum install python3 python3-pip postgresql postgresql-server redis nginx
```

### 2. Deploy with Script

```bash
# Clone the repository
git clone <repository-url>
cd ai_research_system

# Run deployment script
sudo bash deploy/deploy.sh
```

### 3. Configure Environment

Edit `/var/www/ai_research_system/.env`:

```bash
# Required settings
SECRET_KEY=your-super-secret-production-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_NAME=ai_research_system_prod
DB_USER=ai_research_user
DB_PASSWORD=your-secure-database-password

# Optional but recommended
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### 4. Create Superuser

```bash
sudo -u www-data /var/www/ai_research_system/venv/bin/python \
  /var/www/ai_research_system/manage.py createsuperuser \
  --settings=ai_research_system.settings.production
```

## Manual Deployment

### 1. System Setup

```bash
# Create user and directories
sudo useradd --system --shell /bin/bash --home /var/www/ai_research_system www-data
sudo mkdir -p /var/www/ai_research_system
sudo mkdir -p /var/log/ai_research_system
sudo chown www-data:www-data /var/www/ai_research_system /var/log/ai_research_system
```

### 2. Application Setup

```bash
# Copy application files
sudo cp -r . /var/www/ai_research_system/
sudo chown -R www-data:www-data /var/www/ai_research_system

# Create virtual environment
cd /var/www/ai_research_system
sudo -u www-data python3 -m venv venv
sudo -u www-data venv/bin/pip install -r requirements-production.txt
```

### 3. Database Setup

```bash
# PostgreSQL setup
sudo -u postgres createuser ai_research_user
sudo -u postgres createdb ai_research_system_prod -O ai_research_user
sudo -u postgres psql -c "ALTER USER ai_research_user PASSWORD 'your-password';"

# Run migrations
sudo -u www-data venv/bin/python manage.py migrate \
  --settings=ai_research_system.settings.production
```

### 4. Static Files

```bash
sudo -u www-data venv/bin/python manage.py collectstatic --noinput \
  --settings=ai_research_system.settings.production
```

### 5. Services Setup

```bash
# Install systemd services
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo cp deploy/systemd/*.socket /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start services
sudo systemctl enable ai-research-system.socket
sudo systemctl enable ai-research-system.service
sudo systemctl enable ai-research-celery.service
sudo systemctl start ai-research-system.socket
sudo systemctl start ai-research-system.service
sudo systemctl start ai-research-celery.service
```

### 6. Nginx Configuration

```bash
# Install nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ai_research_system
sudo ln -s /etc/nginx/sites-available/ai_research_system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | Yes | - | Django secret key |
| `DEBUG` | No | False | Debug mode (keep False in production) |
| `ALLOWED_HOSTS` | Yes | - | Comma-separated list of allowed hosts |
| `DB_ENGINE` | No | postgresql | Database engine |
| `DB_NAME` | Yes* | - | Database name (*required for PostgreSQL) |
| `DB_USER` | Yes* | - | Database user (*required for PostgreSQL) |
| `DB_PASSWORD` | Yes* | - | Database password (*required for PostgreSQL) |
| `DB_HOST` | No | localhost | Database host |
| `DB_PORT` | No | 5432 | Database port |
| `REDIS_URL` | No | redis://127.0.0.1:6379/1 | Redis connection URL |
| `SECURE_SSL_REDIRECT` | No | False | Force HTTPS redirects |
| `SESSION_COOKIE_SECURE` | No | False | Secure session cookies |
| `CSRF_COOKIE_SECURE` | No | False | Secure CSRF cookies |

### Health Check Endpoints

- **`/health/`** - Comprehensive health check (database, Redis, filesystem)
- **`/ready/`** - Readiness probe for load balancers
- **`/live/`** - Liveness probe for container orchestration

### Logging

Logs are written to:
- `/var/log/ai_research_system/app.log` - Application logs
- `/var/log/ai_research_system/error.log` - Error logs
- `/var/log/ai_research_system/security.log` - Security events

## Monitoring

### Service Status

```bash
# Check service status
sudo systemctl status ai-research-system.service
sudo systemctl status ai-research-celery.service

# View logs
sudo journalctl -u ai-research-system.service -f
sudo journalctl -u ai-research-celery.service -f
```

### Health Checks

```bash
# Test health endpoints
curl -I http://localhost/health/
curl -I http://localhost/ready/
curl -I http://localhost/live/

# Test API
curl -I http://localhost/api/research/sessions/
```

## Security Considerations

1. **SSL/TLS**: Configure SSL certificates and enable HTTPS
2. **Firewall**: Restrict access to necessary ports only
3. **Database**: Use strong passwords and restrict network access
4. **Updates**: Keep system packages and Python dependencies updated
5. **Backups**: Implement regular database and media file backups

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure www-data owns all application files
2. **Database Connection**: Check PostgreSQL service and credentials
3. **Redis Connection**: Verify Redis service is running
4. **Static Files**: Run `collectstatic` after code updates
5. **Service Failures**: Check systemd logs with `journalctl`

### Performance Tuning

1. **Database**: Configure PostgreSQL connection pooling
2. **Cache**: Use Redis for session storage and caching
3. **Static Files**: Use CDN for static file serving
4. **Workers**: Adjust Gunicorn worker count based on CPU cores

## Maintenance

### Updates

```bash
# Update application code
cd /var/www/ai_research_system
sudo -u www-data git pull origin main
sudo -u www-data venv/bin/pip install -r requirements-production.txt
sudo -u www-data venv/bin/python manage.py migrate --settings=ai_research_system.settings.production
sudo -u www-data venv/bin/python manage.py collectstatic --noinput --settings=ai_research_system.settings.production
sudo systemctl restart ai-research-system.service
sudo systemctl restart ai-research-celery.service
```

### Backups

```bash
# Database backup
sudo -u postgres pg_dump ai_research_system_prod > backup_$(date +%Y%m%d).sql

# Media files backup
sudo tar -czf media_backup_$(date +%Y%m%d).tar.gz /var/www/ai_research_system/media/
```

## Support

For issues and questions:
1. Check the application logs
2. Review systemd service status
3. Verify configuration settings
4. Test health check endpoints