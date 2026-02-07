# 🔬 AI Research System

A powerful AI-powered deep research system that leverages multiple LLM providers to conduct comprehensive research, generate reports, and provide intelligent analysis on any topic.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Django](https://img.shields.io/badge/Django-5.0+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1+-black.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features

- **🤖 Multi-Model Research** - Leverages OpenAI, Anthropic, Google Gemini, and Groq for comprehensive research
- **🔍 Intelligent Web Search** - Integrated Tavily search for real-time information gathering
- **📊 Deep Research Analysis** - Multi-layer research with supervisor and researcher agents
- **📝 Automated Report Generation** - Generates well-structured research reports
- **💾 Session Management** - Save, continue, and manage research sessions
- **🔄 Real-time Updates** - Live progress tracking during research
- **📁 Context File Upload** - Upload documents to provide research context
- **🔗 LangSmith Integration** - Full observability with LangSmith tracing

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│                     React + TypeScript                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Django REST)                     │
│              Django + DRF + Celery + Redis                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Open Deep Research Engine                    │
│           LangGraph + Multi-Agent Architecture              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Redis (for Celery task queue)
- PostgreSQL (for production) or SQLite (for development)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-research-system.git
cd ai-research-system
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install local open_deep_research package
pip install -e ./open_deep_research

# Run migrations
python manage.py migrate

# Start the development server
python manage.py runserver 0.0.0.0:8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Environment Variables

Create a `.env` file in the root directory:

```env
# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (for production)
DATABASE_URL=postgresql://user:password@localhost:5432/ai_research

# API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
GROQ_API_KEY=your-groq-api-key
TAVILY_API_KEY=your-tavily-api-key

# LangSmith (Optional - for tracing)
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=ai-research-system

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/research/start` | POST | Start a new research session |
| `/api/research/{id}` | GET | Get research session details |
| `/api/research/{id}/continue` | POST | Continue an existing research |
| `/api/research/{id}/upload` | POST | Upload context file |
| `/api/research/history` | GET | Get research history |
| `/api/csrf/` | GET | Get CSRF token |

## 🚢 Deployment

### Render Deployment

The project includes a `render.yaml` Blueprint for easy deployment:

1. Fork this repository
2. Connect to Render
3. Deploy using the Blueprint
4. Set environment variables in Render dashboard

### Manual Deployment

```bash
# Build command
pip install -r requirements.txt
pip install -e ./open_deep_research
python manage.py collectstatic --no-input
python manage.py migrate

# Start command
gunicorn ai_research_system.wsgi:application
```

## 📁 Project Structure

```
ai-research-system/
├── ai_research_system/        # Django project settings
│   ├── settings/
│   │   ├── base.py           # Base settings
│   │   ├── development.py    # Development settings
│   │   └── production.py     # Production settings
│   ├── urls.py
│   └── wsgi.py
├── research/                  # Main Django app
│   ├── api_views.py          # API endpoints
│   ├── models.py             # Database models
│   ├── serializers.py        # DRF serializers
│   ├── services.py           # Business logic
│   └── tasks.py              # Celery tasks
├── frontend/                  # Next.js frontend
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── components/       # React components
│   │   └── lib/              # Utilities & API client
│   └── package.json
├── open_deep_research/        # Research engine (submodule)
│   └── src/
│       └── open_deep_research/
│           ├── deep_researcher.py
│           ├── configuration.py
│           └── prompts.py
├── requirements.txt
├── render.yaml               # Render Blueprint
├── build.sh                  # Build script
└── README.md
```

## 🛠️ Configuration

### Research Models

Configure models in `open_deep_research/src/open_deep_research/configuration.py`:

- `research_model` - Main research model
- `summarization_model` - For summarizing search results
- `compression_model` - For compressing research findings
- `final_report_model` - For generating final reports

### Search API

Supports multiple search providers:
- **Tavily** (default) - Best for general research
- **OpenAI** - Native web search
- **Anthropic** - Native web search

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) - LLM framework
- [LangGraph](https://github.com/langchain-ai/langgraph) - Multi-agent orchestration
- [Open Deep Research](https://github.com/langchain-ai/open_deep_research) - Research engine
- [Tavily](https://tavily.com/) - Search API

---

**Built with ❤️ using AI-powered technologies**
