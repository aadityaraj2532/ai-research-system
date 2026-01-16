# 🚀 START HERE - Quick Deployment Guide

## Choose Your Deployment Method

### 🎯 Option 1: Run Locally (Fastest - 5 minutes)

**Best for:** Testing and development

#### Prerequisites:
- ✅ Python 3.10+ installed
- ✅ Node.js 18+ installed
- ✅ Your API keys in `.env` file (already configured)

#### Steps:

**Terminal 1 - Backend:**
```bash
# Double-click this file or run:
start_local.bat
```

**Terminal 2 - Celery Worker:**
```bash
# Double-click this file or run:
start_celery.bat
```

**Terminal 3 - Frontend:**
```bash
# Double-click this file or run:
start_frontend.bat
```

#### Access Your App:
- 🌐 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:8000
- 👤 Admin Panel: http://localhost:8000/admin

---

### 🐳 Option 2: Docker Deployment (Production-Ready)

**Best for:** Production deployment with all services

#### Prerequisites:
- Install Docker Desktop: https://www.docker.com/products/docker-desktop/

#### Steps:

1. **Install Docker Desktop**
   - Download from link above
   - Install and restart computer
   - Start Docker Desktop

2. **Deploy:**
   ```bash
   # Start all services
   docker-compose up --build
   ```

3. **Access Your App:**
   - 🌐 Frontend: http://localhost:3000
   - 🔧 Backend API: http://localhost:8000

---

### ☁️ Option 3: Deploy to Cloud (Free Tier Available)

**Best for:** Public deployment, sharing with others

#### A. Netlify (Frontend) + Render (Backend)

**Frontend to Netlify:**
```bash
cd frontend
npm run build

# Use Netlify CLI or drag & drop to Netlify dashboard
```

**Backend to Render:**
1. Go to https://render.com
2. Connect your GitHub repository
3. Create new Web Service
4. Select `ai-research-system` repo
5. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn ai_research_system.wsgi:application`
6. Add environment variables from `.env`
7. Deploy!

---

## 🎬 Quick Start (Recommended)

If you just want to test the app quickly:

### Step 1: Start Backend
```bash
# Open Command Prompt in project folder
start_local.bat
```

Wait for: `Starting development server at http://127.0.0.1:8000/`

### Step 2: Start Celery (New Terminal)
```bash
start_celery.bat
```

Wait for: `celery@... ready.`

### Step 3: Start Frontend (New Terminal)
```bash
start_frontend.bat
```

Wait for: `Ready in ...ms`

### Step 4: Open Browser
Go to: http://localhost:3000

---

## ✅ Verify Everything Works

### 1. Check Backend Health
Open: http://localhost:8000/health/

Should see:
```json
{
  "status": "healthy",
  "database": "connected",
  "cache": "connected"
}
```

### 2. Test Research
1. Go to http://localhost:3000
2. Enter a research query: "What is artificial intelligence?"
3. Click "Start Research"
4. Wait for results (30-60 seconds)

### 3. Check Admin Panel
1. Go to http://localhost:8000/admin
2. Create superuser if needed:
   ```bash
   python manage.py createsuperuser
   ```

---

## 🐛 Troubleshooting

### Backend won't start

**Error: "Port 8000 already in use"**
```bash
# Find and kill process using port 8000
netstat -ano | findstr :8000
taskkill /PID <process-id> /F
```

**Error: "Module not found"**
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend won't start

**Error: "Port 3000 already in use"**
```bash
# Find and kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <process-id> /F
```

**Error: "Cannot find module"**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Celery won't start

**Error: "Connection refused"**
- This is normal in development mode
- Research will still work (tasks run synchronously)
- For production, use Redis with Docker

### Research not working

**Check API Keys:**
1. Open `.env` file
2. Verify these are set:
   - `OPENAI_API_KEY`
   - `TAVILY_API_KEY`
   - `LANGCHAIN_API_KEY`

**Check Celery:**
- Make sure `start_celery.bat` is running
- Check for errors in Celery terminal

**Check Logs:**
```bash
# Backend logs
python manage.py runserver

# Celery logs
celery -A ai_research_system worker --loglevel=debug
```

---

## 📊 Monitor Your Deployment

### Check Research Sessions
```bash
python check_costs.py
```

### Analyze Specific Session
```bash
python analyze_session.py <session-id>
```

### View Database
```bash
python manage.py dbshell
```

---

## 🔄 Update Your Deployment

### Pull Latest Changes
```bash
git pull origin main
```

### Update Dependencies
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Run Migrations
```bash
python manage.py migrate
```

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Test research functionality
2. ✅ Create admin user
3. ✅ Explore the UI
4. ✅ Check cost tracking
5. ✅ Review session analysis

---

## 💡 Tips

- **Development:** Use Option 1 (Local)
- **Testing:** Use Option 2 (Docker)
- **Production:** Use Option 3 (Cloud)

- Keep all three terminals open while using the app
- Check logs if something doesn't work
- Use `analyze_session.py` to debug research issues

---

## 🆘 Need Help?

1. Check the logs in each terminal
2. Run health check: http://localhost:8000/health/
3. Review `DEPLOYMENT_OPTIONS.md` for more details
4. Check `TROUBLESHOOTING.md` for common issues

---

## 🎉 You're Ready!

Choose your deployment method above and follow the steps.

**Recommended for first-time:** Start with Option 1 (Local) to test everything works!
