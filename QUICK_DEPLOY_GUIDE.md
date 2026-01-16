# 🚀 Quick Deployment Guide

## Option 1: Local Docker Deployment (Recommended for Testing)

### Prerequisites
- Docker Desktop installed and running
- Your API keys ready (already in .env)

### Steps:

#### 1. Verify Docker is Running
```bash
docker --version
docker-compose --version
```

#### 2. Build and Start Services
```bash
# Start all services in development mode
docker-compose up --build
```

This will start:
- ✅ Backend (Django) on http://localhost:8000
- ✅ Frontend (Next.js) on http://localhost:3000
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Celery worker for background tasks

#### 3. Access Your Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

#### 4. Create Admin User (First Time Only)
```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## Option 2: Production Docker Deployment

### Prerequisites
- Docker installed on your server
- Domain name (optional, can use IP address)
- Server with at least 2GB RAM

### Steps:

#### 1. Prepare Production Environment File

Create `.env.production`:
```bash
# Copy from .env and update these values:
SECRET_KEY=<generate-new-secret-key>
DEBUG=False
DJANGO_ENVIRONMENT=production
ALLOWED_HOSTS=your-domain.com,your-ip-address

# Database (will be created by Docker)
DB_NAME=ai_research_db
DB_USER=ai_research_user
DB_PASSWORD=<strong-password>
DB_HOST=db
DB_PORT=5432

# Redis
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Your API Keys (keep from .env)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_API_BASE=https://api.groq.com/openai/v1
TAVILY_API_KEY=your-tavily-api-key-here
LANGCHAIN_API_KEY=your-langchain-api-key-here
LANGCHAIN_PROJECT=ai-research-system
LANGCHAIN_TRACING_V2=true

# Frontend
NEXT_PUBLIC_API_URL=http://your-domain.com:8000
```

#### 2. Generate Secret Key
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 3. Deploy with Production Docker Compose
```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --settings=ai_research_system.settings.production

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput --settings=ai_research_system.settings.production

# Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser --settings=ai_research_system.settings.production
```

#### 4. Access Your Application
- **Frontend**: http://your-domain.com (port 80)
- **Backend API**: http://your-domain.com:8000
- **Admin Panel**: http://your-domain.com:8000/admin

---

## Option 3: Cloud Deployment (DigitalOcean, AWS, Azure)

### DigitalOcean Droplet (Recommended)

#### 1. Create Droplet
- Size: Basic ($12/month - 2GB RAM, 1 CPU)
- Image: Ubuntu 22.04 LTS
- Add SSH key

#### 2. Connect to Server
```bash
ssh root@your-server-ip
```

#### 3. Install Docker
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

#### 4. Clone Your Repository
```bash
git clone https://github.com/aadityaraj2532/ai-research-system.git
cd ai-research-system
```

#### 5. Setup Environment
```bash
# Create .env file
nano .env

# Paste your production environment variables
# Save with Ctrl+X, Y, Enter
```

#### 6. Deploy
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --settings=ai_research_system.settings.production

# Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser --settings=ai_research_system.settings.production
```

#### 7. Configure Firewall
```bash
# Allow HTTP, HTTPS, SSH
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 8000
ufw enable
```

---

## Option 4: Netlify Deployment (Frontend Only)

Since you have the Netlify power installed, you can deploy the frontend to Netlify:

### Steps:

#### 1. Build Frontend for Production
```bash
cd frontend
npm run build
```

#### 2. Deploy to Netlify
Use the Netlify power or Netlify CLI:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

#### 3. Configure Environment Variables in Netlify
Add these in Netlify dashboard:
- `NEXT_PUBLIC_API_URL`: Your backend URL

---

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
# Check logs
docker-compose logs -f

# Check specific service
docker-compose logs backend
docker-compose logs frontend
```

**Port already in use:**
```bash
# Find process using port
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Kill process (Windows)
taskkill /PID <process-id> /F
```

**Database connection errors:**
```bash
# Check database is running
docker-compose ps

# Restart database
docker-compose restart db
```

### API Key Issues

**Research not working:**
- Verify OPENAI_API_KEY is valid
- Verify TAVILY_API_KEY is valid
- Check Celery worker logs: `docker-compose logs celery`

### Frontend Issues

**Can't connect to backend:**
- Check NEXT_PUBLIC_API_URL in frontend/.env
- Verify backend is running: `curl http://localhost:8000/health/`
- Check CORS settings in backend

---

## Quick Commands Reference

### Development
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend
```

### Production
```bash
# Start production
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production
docker-compose -f docker-compose.prod.yml down

# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U ai_research_user ai_research_db > backup.sql
```

### Maintenance
```bash
# Update code
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

---

## Next Steps After Deployment

1. ✅ Test research functionality
2. ✅ Create admin user
3. ✅ Configure domain name (if using)
4. ✅ Setup SSL/HTTPS (for production)
5. ✅ Configure backups
6. ✅ Setup monitoring
7. ✅ Test all features

---

## Need Help?

Run the analysis tool to check your deployment:
```bash
python analyze_session.py
```

Check health endpoint:
```bash
curl http://localhost:8000/health/
```
