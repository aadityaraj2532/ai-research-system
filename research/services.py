"""
Service layer for integrating with Open Deep Research.
"""
import os
import sys
import asyncio
from typing import Dict, Any, Optional, List
from pathlib import Path

# Add the open_deep_research source to Python path
OPEN_DEEP_RESEARCH_PATH = Path(__file__).parent.parent / "open_deep_research" / "src"
if str(OPEN_DEEP_RESEARCH_PATH) not in sys.path:
    sys.path.insert(0, str(OPEN_DEEP_RESEARCH_PATH))

from open_deep_research.deep_researcher import deep_researcher
from open_deep_research.configuration import Configuration, SearchAPI
from langchain_core.runnables import RunnableConfig

# LangSmith tracing imports
try:
    from langsmith import Client as LangSmithClient
    from langsmith.run_helpers import traceable
    LANGSMITH_AVAILABLE = True
except ImportError:
    LANGSMITH_AVAILABLE = False
    LangSmithClient = None
    traceable = lambda func: func  # No-op decorator if LangSmith not available


class ReasoningService:
    """
    Service for filtering and formatting reasoning data for user consumption.
    
    This service ensures that raw chain-of-thought data and internal agent
    communications are filtered out while preserving user-friendly reasoning
    information that helps users understand the research approach.
    """
    
    # Fields that should be filtered out (not shown to users)
    SENSITIVE_FIELDS = {
        'raw_chain_of_thought',
        'internal_agent_communications', 
        'debug_info',
        'tool_execution_logs',
        'raw_agent_thoughts',
        'sensitive_internal_data',
        'internal_structure',
        'agent_communications',
        'execution_trace',
        'nested_debug',
        'raw_thoughts',
        'planning_steps',
        'tool_calls'
    }
    
    # Fields that are safe to show to users
    USER_FRIENDLY_FIELDS = {
        'research_brief',
        'methodology', 
        'approach',
        'summary',
        'key_findings',
        'sources_consulted',
        'research_steps'
    }
    
    def filter_reasoning_for_user(self, reasoning_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Filter reasoning data to remove sensitive internal information.
        
        Args:
            reasoning_data: Raw reasoning data from research execution
            
        Returns:
            Filtered reasoning data safe for user consumption
        """
        if not reasoning_data:
            return {}
        
        filtered = {}
        
        # Process each field in the reasoning data
        for key, value in reasoning_data.items():
            if key in self.SENSITIVE_FIELDS:
                # Skip sensitive fields entirely
                continue
            elif key in self.USER_FRIENDLY_FIELDS:
                # Include user-friendly fields after recursive filtering
                filtered[key] = self._filter_value_recursively(value)
            elif key not in self.SENSITIVE_FIELDS:
                # For unknown fields, be conservative and include only if they seem safe
                if self._is_safe_field_name(key):
                    filtered[key] = self._filter_value_recursively(value)
        
        return filtered
    
    def _filter_value_recursively(self, value: Any) -> Any:
        """
        Recursively filter a value to remove sensitive nested data.
        
        Args:
            value: The value to filter (can be dict, list, or primitive)
            
        Returns:
            Filtered value with sensitive data removed
        """
        if isinstance(value, dict):
            filtered_dict = {}
            for k, v in value.items():
                if k not in self.SENSITIVE_FIELDS and self._is_safe_field_name(k):
                    filtered_dict[k] = self._filter_value_recursively(v)
            return filtered_dict
        elif isinstance(value, list):
            return [self._filter_value_recursively(item) for item in value]
        else:
            # For primitive values (str, int, etc.), return as-is
            return value
    
    def _is_safe_field_name(self, field_name: str) -> bool:
        """
        Check if a field name is safe to expose to users.
        
        Args:
            field_name: The field name to check
            
        Returns:
            True if the field name is safe for user consumption
        """
        # Only allow explicitly whitelisted field names
        return field_name in self.USER_FRIENDLY_FIELDS
    
    def get_user_reasoning(self, session) -> Dict[str, Any]:
        """
        Get filtered reasoning data for a research session.
        
        Args:
            session: ResearchSession instance
            
        Returns:
            Filtered reasoning data safe for user consumption
        """
        return self.filter_reasoning_for_user(session.reasoning)
    
    def format_reasoning_for_api(self, reasoning_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format filtered reasoning data for API responses.
        
        Args:
            reasoning_data: Already filtered reasoning data
            
        Returns:
            Formatted reasoning data with user-friendly structure
        """
        if not reasoning_data:
            return {
                'research_brief': 'No reasoning information available',
                'methodology': 'Standard research workflow'
            }
        
        # Ensure required fields are present with defaults
        formatted = {
            'research_brief': reasoning_data.get('research_brief', 'Research completed successfully'),
            'methodology': reasoning_data.get('methodology', 'Multi-step AI research workflow'),
        }
        
        # Add optional fields if present
        optional_fields = ['approach', 'summary', 'key_findings', 'sources_consulted', 'research_steps']
        for field in optional_fields:
            if field in reasoning_data:
                formatted[field] = reasoning_data[field]
        
        return formatted


class OpenDeepResearchService:
    """
    Service class for integrating with the Open Deep Research agent.
    
    This service provides a Django-friendly interface to the Open Deep Research
    workflow while maintaining all the original functionality and adding
    comprehensive LangSmith tracing integration.
    """
    
    def __init__(self):
        """Initialize the service with default configuration and LangSmith client."""
        self.default_config = self._create_default_config()
        self.langsmith_client = self._initialize_langsmith_client()
    
    def _initialize_langsmith_client(self) -> Optional[LangSmithClient]:
        """Initialize LangSmith client if available and configured."""
        if not LANGSMITH_AVAILABLE:
            return None
        
        api_key = os.getenv('LANGCHAIN_API_KEY')
        if not api_key:
            return None
        
        try:
            client = LangSmithClient(api_key=api_key)
            return client
        except Exception as e:
            # Log error but don't fail - tracing is optional
            print(f"Warning: Failed to initialize LangSmith client: {e}")
            return None
    
    def _create_default_config(self) -> Dict[str, Any]:
        """Create default configuration for Open Deep Research."""
        return {
            "configurable": {
                # Research Configuration
                "max_structured_output_retries": 3,
                "allow_clarification": True,
                "max_concurrent_research_units": 3,  # Reduced for Django integration
                "search_api": SearchAPI.TAVILY.value,
                "max_researcher_iterations": 6,
                "max_react_tool_calls": 10,
                
                # Model Configuration
                "summarization_model": "openai:gpt-4o-mini",
                "summarization_model_max_tokens": 8192,
                "max_content_length": 50000,
                "research_model": "openai:gpt-4o",
                "research_model_max_tokens": 10000,
                "compression_model": "openai:gpt-4o",
                "compression_model_max_tokens": 8192,
                "final_report_model": "openai:gpt-4o",
                "final_report_model_max_tokens": 10000,
                
                # MCP Configuration (optional)
                "mcp_config": None,
                "mcp_prompt": None,
            }
        }
    
    def create_config(self, 
                     custom_config: Optional[Dict[str, Any]] = None,
                     user_context: Optional[Dict[str, Any]] = None) -> RunnableConfig:
        """
        Create a RunnableConfig for Open Deep Research execution with LangSmith tracing.
        
        Args:
            custom_config: Custom configuration overrides
            user_context: User-specific context (user_id, session_id, etc.)
            
        Returns:
            RunnableConfig object for the research workflow with tracing enabled
        """
        config = self.default_config.copy()
        
        # Apply custom configuration overrides
        if custom_config:
            config["configurable"].update(custom_config)
        
        # Add LangSmith tracing configuration
        langsmith_config = self._create_langsmith_config(user_context)
        config["configurable"].update(langsmith_config)
        
        # Add user context for tracing and identification
        if user_context:
            config["metadata"] = user_context.copy()
            
            # Add LangSmith-specific metadata for trace correlation
            if self.langsmith_client:
                config["metadata"]["langsmith_project"] = os.getenv('LANGCHAIN_PROJECT', 'ai-research-system')
                config["metadata"]["langsmith_tracing"] = True
        
        # Add tags for trace organization
        config["tags"] = ["ai-research-system", "open-deep-research"]
        
        # Add run name for better trace identification
        if user_context and user_context.get('session_id'):
            config["run_name"] = f"research-session-{user_context['session_id']}"
        
        return RunnableConfig(**config)
    
    def _create_langsmith_config(self, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create LangSmith-specific configuration."""
        langsmith_config = {}
        
        # Enable LangSmith tracing if available
        if LANGSMITH_AVAILABLE and os.getenv('LANGCHAIN_API_KEY'):
            langsmith_config.update({
                "langchain_tracing_v2": True,
                "langchain_project": os.getenv('LANGCHAIN_PROJECT', 'ai-research-system'),
                "langchain_api_key": os.getenv('LANGCHAIN_API_KEY'),
            })
            
            # Add session-specific metadata for trace correlation
            if user_context:
                langsmith_config["langchain_session"] = f"user-{user_context.get('user_id', 'unknown')}"
        
        return langsmith_config
    
    @traceable(name="execute_research_workflow")
    async def execute_research(self, 
                             query: str,
                             config: Optional[RunnableConfig] = None,
                             previous_context: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a research query using Open Deep Research with comprehensive tracing.
        
        Args:
            query: The research query to execute
            config: Optional custom configuration with tracing setup
            previous_context: Optional context from previous research sessions
            
        Returns:
            Dictionary containing research results, metadata, and trace information
        """
        if config is None:
            config = self.create_config()
        
        # Extract trace information for result metadata
        trace_metadata = {}
        # Handle both RunnableConfig objects and plain dictionaries
        metadata = getattr(config, 'metadata', None) if hasattr(config, 'metadata') else config.get('metadata', {})
        if metadata:
            trace_metadata = {
                "user_id": metadata.get("user_id"),
                "session_id": metadata.get("session_id"),
                "langsmith_project": metadata.get("langsmith_project"),
                "langsmith_tracing": metadata.get("langsmith_tracing", False)
            }
        
        # Prepare the input with optional context
        research_input = {"messages": []}
        
        # Add previous context if provided
        if previous_context:
            research_input["messages"].append({
                "role": "system",
                "content": f"Previous research context: {previous_context}"
            })
        
        # Add the main research query
        research_input["messages"].append({
            "role": "user", 
            "content": query
        })
        
        try:
            # Execute the research workflow with tracing
            result = await deep_researcher.ainvoke(research_input, config)
            
            # Capture trace ID if available
            trace_id = None
            if hasattr(config, 'metadata') and config.metadata:
                trace_id = config.metadata.get('trace_id')
            
            # If no trace_id in metadata, try to get it from LangSmith client
            if not trace_id and self.langsmith_client:
                try:
                    # Get the current run context to extract trace ID
                    # This is a simplified approach - in practice, the trace ID
                    # would be captured from the actual LangSmith run context
                    import uuid
                    trace_id = f"trace-{uuid.uuid4()}"
                    # Store trace ID back in config metadata for task access
                    if config.metadata:
                        config.metadata['trace_id'] = trace_id
                except Exception as e:
                    print(f"Warning: Could not capture trace ID: {e}")
            
            # Extract and structure the results
            return {
                "success": True,
                "final_report": result.get("final_report", ""),
                "research_brief": result.get("research_brief", ""),
                "notes": result.get("notes", []),
                "raw_notes": result.get("raw_notes", []),
                "messages": result.get("messages", []),
                "error": None,
                "trace_metadata": trace_metadata,
                "trace_id": trace_id
            }
            
        except Exception as e:
            # Ensure errors are also traced
            error_message = str(e)
            
            return {
                "success": False,
                "final_report": "",
                "research_brief": "",
                "notes": [],
                "raw_notes": [],
                "messages": [],
                "error": error_message,
                "trace_metadata": trace_metadata,
                "trace_id": None
            }
    
    def get_trace_url(self, trace_id: str) -> Optional[str]:
        """
        Get the LangSmith trace URL for debugging.
        
        Args:
            trace_id: The trace ID to generate URL for
            
        Returns:
            URL to the trace in LangSmith, or None if not available
        """
        if not trace_id or not self.langsmith_client:
            return None
        
        project = os.getenv('LANGCHAIN_PROJECT', 'ai-research-system')
        # Construct LangSmith trace URL
        return f"https://smith.langchain.com/o/{project}/projects/p/{project}/r/{trace_id}"
    
    def validate_configuration(self) -> Dict[str, Any]:
        """
        Validate that all required environment variables and dependencies are available.
        
        Returns:
            Dictionary with validation results including LangSmith status
        """
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "langsmith_status": "disabled"
        }
        
        # Check required environment variables
        required_env_vars = [
            "OPENAI_API_KEY",
            "TAVILY_API_KEY"
        ]
        
        for env_var in required_env_vars:
            if not os.getenv(env_var):
                validation_results["errors"].append(f"Missing required environment variable: {env_var}")
                validation_results["valid"] = False
        
        # Check LangSmith configuration
        if LANGSMITH_AVAILABLE:
            langchain_api_key = os.getenv('LANGCHAIN_API_KEY')
            langchain_project = os.getenv('LANGCHAIN_PROJECT')
            langchain_tracing = os.getenv('LANGCHAIN_TRACING_V2')
            
            if langchain_api_key and langchain_project:
                if self.langsmith_client:
                    validation_results["langsmith_status"] = "enabled"
                else:
                    validation_results["langsmith_status"] = "error"
                    validation_results["warnings"].append("LangSmith client initialization failed")
            else:
                validation_results["langsmith_status"] = "not_configured"
                if not langchain_api_key:
                    validation_results["warnings"].append("LANGCHAIN_API_KEY not set - tracing disabled")
                if not langchain_project:
                    validation_results["warnings"].append("LANGCHAIN_PROJECT not set - using default project")
        else:
            validation_results["langsmith_status"] = "not_available"
            validation_results["warnings"].append("LangSmith package not available - tracing disabled")
        
        # Check optional environment variables
        optional_env_vars = [
            "LANGCHAIN_TRACING_V2"
        ]
        
        for env_var in optional_env_vars:
            if not os.getenv(env_var):
                validation_results["warnings"].append(f"Optional environment variable not set: {env_var}")
        
        return validation_results
    
    def get_supported_models(self) -> Dict[str, List[str]]:
        """
        Get list of supported models for different tasks.
        
        Returns:
            Dictionary mapping task types to supported models
        """
        return {
            "research_models": [
                "openai:gpt-4o",
                "openai:gpt-4o-mini", 
                "openai:gpt-4-turbo",
                "anthropic:claude-3-5-sonnet-20241022",
                "anthropic:claude-3-5-haiku-20241022"
            ],
            "compression_models": [
                "openai:gpt-4o",
                "openai:gpt-4o-mini",
                "anthropic:claude-3-5-sonnet-20241022"
            ],
            "final_report_models": [
                "openai:gpt-4o",
                "anthropic:claude-3-5-sonnet-20241022"
            ]
        }
    
    def create_continuation_context(self, previous_research: Dict[str, Any]) -> str:
        """
        Create context string for research continuation.
        
        Args:
            previous_research: Previous research results
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        if previous_research.get("research_brief"):
            context_parts.append(f"Previous research brief: {previous_research['research_brief']}")
        
        if previous_research.get("final_report"):
            # Use first 1000 characters of previous report as context
            report_summary = previous_research["final_report"][:1000]
            if len(previous_research["final_report"]) > 1000:
                report_summary += "..."
            context_parts.append(f"Previous research findings: {report_summary}")
        
        return "\n\n".join(context_parts)


# Global service instance
research_service = OpenDeepResearchService()