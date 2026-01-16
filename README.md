# AI Research System

AI-powered research system with premium UI, built with Django, Next.js, and Groq API.

## Quick Start (Development)

### 1. Install Dependencies

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root with the following variables:
- `SECRET_KEY` - Django secret key (generate with: `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`)
- `OPENAI_API_KEY` - Groq API key
- `TAVILY_API_KEY` - Search API key
- `LANGCHAIN_API_KEY` - LangSmith tracing key (optional)

### 3. Run Servers

```bash
# Backend (Terminal 1)
python manage.py runserver --settings=ai_research_system.settings.development

# Frontend (Terminal 2)
cd frontend
npm run dev
```

### 4. Access Application

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8000
- Login: Create a superuser with `python manage.py createsuperuser`

## Production Deployment

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

**Quick Production Deploy:**

```bash
# 1. Create .env file with production settings
# 2. Deploy with Docker Compose
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Production Checklist:** See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

## Features

- AI-powered research with Groq (free)
- Premium glassmorphism UI
- Full LangSmith tracing
- Research history
- Cost tracking

## Tech Stack

- **Backend:** Django 5.0, Celery
- **Frontend:** Next.js 14, Tailwind CSS, Framer Motion
- **AI:** Groq API (GPT-OSS 20B)
- **Search:** Tavily API
- **Tracing:** LangSmith

## Configuration

### Models
- Research: `openai/gpt-oss-20b`
- Free tier: 8,000 tokens/minute

### Database
- Development: SQLite
- Production: PostgreSQL (configure in `.env`)

## Notes

- Rate limit warnings are normal on free tier
- Research completes successfully despite warnings
- Use neutral query phrasing for best results
- View traces at https://smith.langchain.com/
