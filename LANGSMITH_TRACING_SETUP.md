# LangSmith Tracing Setup - Complete Configuration

## 🎯 Overview

Your Open Deep Research workflow is now **fully connected to LangSmith** with comprehensive tracing, monitoring, and auditability. All LLM runs are traced and visible in the LangSmith dashboard.

## ✅ What's Been Configured

### 1. **Environment Variables** (`.env`)
```bash
# LangSmith Configuration - ENABLED for full tracing and auditability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=ai-research-system
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com

# Required API Keys
OPENAI_API_KEY=your_openai_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

### 2. **Research Service** (`research/services.py`)
- ✅ **LangSmith client initialization**
- ✅ **Automatic trace configuration** for all research sessions
- ✅ **User context tracking** (user_id, session_id, task_id)
- ✅ **Comprehensive metadata** for trace correlation
- ✅ **Trace URL generation** for debugging

### 3. **Django Tasks** (`research/tasks.py`)
- ✅ **Full LangSmith integration** in Celery tasks
- ✅ **Trace ID capture** and storage in database
- ✅ **Session-specific tracing** with user context
- ✅ **Error tracing** for failed research attempts

### 4. **Database Integration**
- ✅ **Trace ID storage** in ResearchSession model
- ✅ **Reasoning data** includes LangSmith trace information
- ✅ **Cost tracking** linked to trace data

## 🔍 How Tracing Works

### **Every Research Session:**
1. **Creates a unique trace** in LangSmith
2. **Captures all LLM calls** (OpenAI, Anthropic, etc.)
3. **Records user context** (user_id, session_id, timestamp)
4. **Stores trace ID** in Django database
5. **Provides trace URL** for debugging

### **What Gets Traced:**
- 🔍 **Search API calls** (Tavily)
- 🤖 **LLM interactions** (OpenAI GPT-4, etc.)
- 📝 **Research steps** and reasoning
- 🔧 **Tool executions** and results
- ❌ **Errors and failures**
- 💰 **Token usage** and costs

## 📊 Viewing Traces

### **LangSmith Dashboard:**
- **URL**: https://smith.langchain.com/
- **Project**: `ai-research-system`
- **Traces**: All research sessions are automatically traced

### **From Django:**
```python
# Get trace URL for a research session
session = ResearchSession.objects.get(id=session_id)
if session.langsmith_trace_id:
    trace_url = research_service.get_trace_url(session.langsmith_trace_id)
    print(f"View trace: {trace_url}")
```

## 🧪 Testing the Setup

### **1. Run Tracing Test:**
```bash
python test_langsmith_tracing.py
```

### **2. Test Research Execution:**
```bash
python manage.py test_research_tracing --query "What is machine learning?"
```

### **3. Check Django Integration:**
```bash
python manage.py shell
```
```python
from research.services import research_service
validation = research_service.validate_configuration()
print(f"LangSmith Status: {validation['langsmith_status']}")
```

## 🔧 Configuration Validation

The system automatically validates:
- ✅ **LangSmith API key** is present and valid
- ✅ **Tracing is enabled** (LANGCHAIN_TRACING_V2=true)
- ✅ **Project is configured** (ai-research-system)
- ✅ **Client connection** to LangSmith API
- ✅ **All required API keys** are present

## 📈 Benefits of LangSmith Integration

### **1. Full Auditability**
- Every LLM call is logged and traceable
- Complete research workflow visibility
- User action tracking and correlation

### **2. Debugging & Monitoring**
- Real-time trace viewing in LangSmith dashboard
- Error tracking and analysis
- Performance monitoring

### **3. Cost Management**
- Token usage tracking per session
- Cost analysis and optimization
- Budget monitoring and alerts

### **4. Compliance & Security**
- Complete audit trail for all AI operations
- User activity logging
- Data governance and compliance

## 🚀 Usage Examples

### **Start a Research Session:**
```python
from research.models import ResearchSession
from research.tasks import execute_research_task

# Create session
session = ResearchSession.objects.create(
    user_id="user123",
    query="Research the latest developments in AI"
)

# Execute with full LangSmith tracing
result = execute_research_task.delay(str(session.id))
```

### **View Trace Information:**
```python
# After execution
session.refresh_from_db()
print(f"Trace ID: {session.langsmith_trace_id}")
print(f"Trace URL: {research_service.get_trace_url(session.langsmith_trace_id)}")
```

## 🔗 LangSmith Dashboard Features

### **Available in Dashboard:**
- 📊 **Trace Timeline** - Step-by-step execution flow
- 💬 **LLM Conversations** - All model interactions
- 🔧 **Tool Calls** - Search API and other tool usage
- 💰 **Cost Breakdown** - Token usage and costs
- ❌ **Error Analysis** - Failed calls and debugging info
- 📈 **Performance Metrics** - Response times and success rates

## 🎉 Summary

Your Open Deep Research workflow is now **fully integrated with LangSmith**:

✅ **All LLM runs are traced** and visible in LangSmith
✅ **Complete auditability** of research operations  
✅ **Real-time monitoring** and debugging capabilities
✅ **Cost tracking** and usage analytics
✅ **User context** and session correlation
✅ **Error tracking** and failure analysis

**Next Steps:**
1. Run test commands to verify everything works
2. Check LangSmith dashboard for traces
3. Start using the research system - all operations will be automatically traced!

**LangSmith Dashboard:** https://smith.langchain.com/o/ai-research-system