# AI Research System

A Django-based REST API system for conducting AI-powered research with file upload capabilities, cost tracking, and research continuation features.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. **Run the Server**
   ```bash
   python manage.py runserver
   ```

## 📋 API Endpoints

### 1. Start Research
**POST** `/api/research/start`

Start a new research session with an optional parent session for continuation.

**Request Body:**
```json
{
  "query": "What are the latest developments in quantum computing?",
  "parent_research_id": "optional-uuid-for-continuation"
}
```

**Response:**
```json
{
  "id": "uuid",
  "query": "string",
  "status": "PENDING|PROCESSING|COMPLETED|FAILED",
  "report": "string",
  "summary": "string", 
  "reasoning": {
    "research_brief": "string",
    "methodology": "string"
  },
  "token_usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0
  },
  "cost": {
    "estimated_cost": 0.00,
    "currency": "USD"
  },
  "trace_id": "langsmith-trace-id",
  "trace_url": "https://smith.langchain.com/...",
  "created_at": "2024-01-01T00:00:00Z",
  "completed_at": null,
  "files": [],
  "is_continuation": false
}
```

### 2. Upload Context File
**POST** `/api/research/{research_id}/upload`

Upload a context file to provide additional information for the research.

**Request:** Multipart form data with `file` field

**Supported File Types:** PDF, TXT, DOC, DOCX (max 10MB)

**Response:**
```json
{
  "id": "uuid",
  "filename": "document.pdf",
  "file_type": "PDF",
  "file_size": 1024000,
  "content_summary": "Brief summary of file content",
  "is_processed": true,
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

### 3. Continue Research
**POST** `/api/research/{research_id}/continue`

Continue research from a completed session with a new query.

**Request Body:**
```json
{
  "query": "How do these developments impact current applications?"
}
```

**Response:** Same as Start Research endpoint

### 4. Get Research History
**GET** `/api/research/history`

Get a list of all research sessions for the authenticated user.

**Query Parameters:**
- `page`: Page number (optional)
- `page_size`: Items per page (optional, default: 20)

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "query": "string",
      "status": "COMPLETED",
      "summary": "string",
      "duration": "00:02:30",
      "is_continuation": false,
      "file_count": 2,
      "created_at": "2024-01-01T00:00:00Z",
      "completed_at": "2024-01-01T00:02:30Z"
    }
  ],
  "count": 1
}
```

### 5. Get Research Details
**GET** `/api/research/{research_id}`

Get detailed information about a specific research session.

**Response:** Same as Start Research endpoint with complete data

## 🏗️ System Architecture

### Core Components

1. **Research Sessions** - Main research entities with queries and results
2. **File Management** - Upload and process context documents
3. **Cost Tracking** - Monitor token usage and API costs
4. **Research Continuation** - Chain related research sessions
5. **Error Handling** - Comprehensive error responses with proper HTTP status codes

### Data Models

#### ResearchSession
- `id`: UUID primary key
- `user_id`: User identifier
- `query`: Research question
- `status`: PENDING, PROCESSING, COMPLETED, FAILED
- `report`: Full research report
- `summary`: Brief summary
- `parent_session`: Link to parent session for continuations
- `langsmith_trace_id`: Tracing identifier
- `created_at`, `completed_at`: Timestamps

#### ResearchFile
- `id`: UUID primary key
- `session`: Foreign key to ResearchSession
- `filename`: Original filename
- `file_type`: PDF, TXT, DOC, DOCX
- `file_size`: Size in bytes
- `content_summary`: Extracted content summary
- `is_processed`: Processing status
- `uploaded_at`, `processed_at`: Timestamps

#### ResearchCost
- `session`: One-to-one with ResearchSession
- `input_tokens`, `output_tokens`, `total_tokens`: Token counts
- `estimated_cost`: Cost in USD
- `provider_costs`: Detailed cost breakdown
- `currency`: Cost currency

### Key Features

#### Non-Blocking Research
- Research execution happens asynchronously using Celery
- Status polling available through the details endpoint
- Real-time status updates

#### Configuration-Driven Model Selection
- Model selection through environment variables
- No hard-coded API keys in source code
- Flexible provider configuration

#### Comprehensive Error Handling
- Custom exception classes with proper HTTP status codes
- Detailed error messages with context
- Structured error responses

#### File Processing
- Automatic text extraction from uploaded documents
- Content summarization for research context
- File validation and security checks

#### Cost Tracking
- Token usage monitoring
- Cost estimation per research session
- Provider-specific cost breakdown

#### LangSmith Integration
- Automatic trace generation
- Debug URLs for trace inspection
- Performance monitoring

## 🔧 Configuration

### Environment Variables

```bash
# Django Settings
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite by default)
DATABASE_URL=sqlite:///db.sqlite3

# LangSmith Integration
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=ai-research-system

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Celery (for async processing)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### File Upload Settings

- **Maximum file size**: 10MB
- **Supported formats**: PDF, TXT, DOC, DOCX
- **Storage location**: `media/research_files/`
- **Processing**: Automatic text extraction and summarization

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
python manage.py test

# Run specific test modules
python manage.py test research.tests
python manage.py test files.test_error_handling

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

### Test Coverage

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Property-Based Tests**: Edge case validation using Hypothesis
- **Error Handling Tests**: Exception and error response testing

## 📊 Monitoring & Debugging

### LangSmith Integration
- Automatic trace generation for all research sessions
- Debug URLs provided in API responses
- Performance metrics and cost tracking

### Logging
- Structured logging with JSON format
- Separate log files for different components:
  - `ai_research_system.log`: General application logs
  - `errors.log`: Error-specific logs
  - `security.log`: Security-related events

### Health Checks
- Database connectivity
- External service availability
- File system permissions

## 🔒 Security Features

- **Authentication**: Required for all endpoints
- **Authorization**: User-specific data isolation
- **File Validation**: MIME type and size checks
- **Input Sanitization**: Query and filename validation
- **Path Traversal Prevention**: Secure file handling
- **Rate Limiting**: Configurable request limits

## 🚀 Production Deployment

The AI Research System is production-ready with comprehensive security, monitoring, and deployment automation.

### Quick Production Deployment

```bash
# Clone the repository
git clone <repository-url>
cd ai_research_system

# Run automated deployment script
sudo bash deploy/deploy.sh

# Configure environment
sudo nano /var/www/ai_research_system/.env

# Create superuser
sudo -u www-data /var/www/ai_research_system/venv/bin/python \
  /var/www/ai_research_system/manage.py createsuperuser \
  --settings=ai_research_system.settings.production
```

### Production Features

✅ **Security Hardening**
- HTTPS enforcement and security headers
- Secure session and cookie settings
- Rate limiting and CORS configuration
- Input validation and sanitization

✅ **Scalable Architecture**
- PostgreSQL database with connection pooling
- Redis caching and session storage
- Gunicorn WSGI server with systemd
- Nginx reverse proxy configuration

✅ **Monitoring & Health Checks**
- Health endpoints: `/health/`, `/ready/`, `/live/`
- Structured JSON logging with rotation
- Error reporting via email
- Performance metrics and cost tracking

✅ **Deployment Automation**
- One-command deployment script
- Systemd service management
- Automated static file collection
- Database migration handling

### Documentation

- **[Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)** - Complete deployment instructions
- **[Production Checklist](PRODUCTION_CHECKLIST.md)** - Pre and post-deployment tasks
- **[Environment Configuration](.env.production.example)** - Production environment template

### Health Check Endpoints

- **`/health/`** - Comprehensive system health (database, Redis, filesystem)
- **`/ready/`** - Readiness probe for load balancers  
- **`/live/`** - Liveness probe for container orchestration

### Service Management

```bash
# Check service status
sudo systemctl status ai-research-system.service
sudo systemctl status ai-research-celery.service

# View logs
sudo journalctl -u ai-research-system.service -f
sudo tail -f /var/log/ai_research_system/app.log

# Restart services
sudo systemctl restart ai-research-system.service
sudo systemctl restart ai-research-celery.service
```

## 📝 API Testing with Postman

A Postman collection is available for testing all API endpoints:

1. **Import Collection**: Import the provided Postman collection
2. **Set Environment Variables**:
   - `base_url`: Your API base URL (e.g., `http://localhost:8000`)
   - `auth_token`: Your authentication token
3. **Test Workflow**:
   - Start a research session
   - Upload context files
   - Monitor research progress
   - Continue research with follow-up questions
   - Review complete research history

### Sample Test Flow

1. **Start Research**
   ```
   POST {{base_url}}/api/research/start
   {
     "query": "What are the benefits of renewable energy?"
   }
   ```

2. **Upload Context File**
   ```
   POST {{base_url}}/api/research/{research_id}/upload
   [Upload a PDF about renewable energy]
   ```

3. **Continue Research**
   ```
   POST {{base_url}}/api/research/{research_id}/continue
   {
     "query": "What are the economic implications?"
   }
   ```

4. **Get Results**
   ```
   GET {{base_url}}/api/research/{research_id}
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.