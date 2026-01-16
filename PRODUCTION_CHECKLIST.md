# Production Readiness Checklist

Use this checklist to ensure your deployment is production-ready.

## Pre-Deployment

- [ ] **Environment Variables**
  - [ ] Created `.env` file from `.env.example`
  - [ ] Generated strong `SECRET_KEY`
  - [ ] Configured `ALLOWED_HOSTS` with your domain(s)
  - [ ] Set all required API keys (OpenAI, Tavily, LangChain)
  - [ ] Configured database credentials
  - [ ] Set up email configuration

- [ ] **Security**
  - [ ] Strong database password set
  - [ ] Redis password configured (if exposed)
  - [ ] `SECRET_KEY` is unique and secure
  - [ ] HTTPS/SSL certificates ready
  - [ ] `CSRF_TRUSTED_ORIGINS` configured
  - [ ] `CORS_ALLOWED_ORIGINS` configured
  - [ ] Security headers enabled in Nginx

- [ ] **Infrastructure**
  - [ ] Docker and Docker Compose installed
  - [ ] Sufficient disk space (recommend 20GB+)
  - [ ] Sufficient RAM (recommend 4GB+)
  - [ ] Firewall rules configured
  - [ ] Domain DNS configured

## Deployment

- [ ] **Initial Setup**
  - [ ] Made deployment scripts executable (`chmod +x scripts/*.sh`)
  - [ ] Built Docker images successfully
  - [ ] Started all services
  - [ ] Verified all containers are running

- [ ] **Database**
  - [ ] Database migrations applied
  - [ ] Created superuser account
  - [ ] Verified database connectivity
  - [ ] Tested database backups

- [ ] **Application**
  - [ ] Static files collected
  - [ ] Health check endpoint responding (`/health/`)
  - [ ] Frontend accessible
  - [ ] API endpoints working
  - [ ] Admin panel accessible

## Post-Deployment

- [ ] **Monitoring**
  - [ ] Health checks configured in monitoring system
  - [ ] Log aggregation set up
  - [ ] Error tracking configured (Sentry)
  - [ ] Alerting configured for critical errors

- [ ] **Backups**
  - [ ] Automated backup script tested
  - [ ] Backup restoration tested
  - [ ] Backup schedule configured (daily recommended)
  - [ ] Backup storage location secure

- [ ] **Performance**
  - [ ] Load tested API endpoints
  - [ ] Verified Celery workers processing tasks
  - [ ] Checked database query performance
  - [ ] Monitored resource usage (CPU, Memory, Disk)

- [ ] **Security Hardening**
  - [ ] Changed default admin password
  - [ ] Verified HTTPS redirects working
  - [ ] Tested CSRF protection
  - [ ] Verified rate limiting is active
  - [ ] Checked security headers in response

- [ ] **Documentation**
  - [ ] Deployment process documented
  - [ ] Team has access to deployment docs
  - [ ] Runbooks created for common issues
  - [ ] Contact information for support documented

## Ongoing Maintenance

- [ ] **Regular Tasks**
  - [ ] Monitor application logs daily
  - [ ] Review error logs weekly
  - [ ] Perform security updates monthly
  - [ ] Review and rotate secrets quarterly
  - [ ] Test backup restoration quarterly

- [ ] **Scaling Readiness**
  - [ ] Plan for horizontal scaling if needed
  - [ ] Database connection pooling configured
  - [ ] CDN configured for static assets (optional)
  - [ ] Load balancer configured (if scaling)

## Troubleshooting Reference

### Common Issues

1. **Services won't start**
   - Check `.env` file exists and is valid
   - Verify no port conflicts
   - Check Docker logs: `docker-compose logs`

2. **Database connection errors**
   - Verify database container is running
   - Check credentials in `.env`
   - Verify network connectivity between containers

3. **Static files not loading**
   - Run `collectstatic` command
   - Check Nginx configuration
   - Verify file permissions

4. **Celery tasks not executing**
   - Check Celery worker logs
   - Verify Redis connection
   - Check task queue in Redis

### Useful Commands

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart a service
docker-compose -f docker-compose.prod.yml restart backend

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Execute command in container
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell

# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U user dbname > backup.sql
```

## Support & Resources

- Django Documentation: https://docs.djangoproject.com/
- Next.js Documentation: https://nextjs.org/docs
- Docker Documentation: https://docs.docker.com/
- Nginx Documentation: https://nginx.org/en/docs/
