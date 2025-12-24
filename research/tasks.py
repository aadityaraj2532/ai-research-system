"""
Celery tasks for background research execution.
"""
import asyncio
import logging
from typing import Dict, Any, Optional
from celery import shared_task
from django.utils import timezone
from .models import ResearchSession, ResearchCost
from .services import research_service
from costs.services import cost_tracking_service

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def execute_research_task(self, session_id: str, custom_config: Optional[Dict[str, Any]] = None):
    """
    Execute a research session in the background using Open Deep Research.
    
    Args:
        session_id: UUID of the research session to execute
        custom_config: Optional custom configuration for the research
        
    Returns:
        Dictionary with execution results
    """
    try:
        # Get the research session
        try:
            session = ResearchSession.objects.get(id=session_id)
        except ResearchSession.DoesNotExist:
            logger.error(f"Research session {session_id} not found")
            return {"success": False, "error": "Research session not found"}
        
        # Update session status to processing
        session.status = 'PROCESSING'
        session.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Starting research execution for session {session_id}")
        
        # Prepare research context
        previous_context = None
        if session.parent_session:
            previous_context = research_service.create_continuation_context({
                "research_brief": session.parent_session.reasoning.get("research_brief", "") if session.parent_session.reasoning else "",
                "final_report": session.parent_session.summary
            })
        
        # Create configuration with user context
        user_context = {
            "user_id": session.user_id,
            "session_id": str(session.id),
            "task_id": self.request.id
        }
        
        config = research_service.create_config(
            custom_config=custom_config,
            user_context=user_context
        )
        
        # Execute research asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                research_service.execute_research(
                    query=session.query,
                    config=config,
                    previous_context=previous_context
                )
            )
        finally:
            loop.close()
        
        # Process results
        if result["success"]:
            # Update session with results
            session.status = 'COMPLETED'
            session.completed_at = timezone.now()
            session.report = {
                "final_report": result["final_report"],
                "notes": result["notes"],
                "sources": []  # Will be extracted from notes if needed
            }
            session.summary = result["research_brief"] or result["final_report"][:500]
            
            # Store comprehensive reasoning data (including sensitive internal data)
            raw_reasoning = {
                "research_brief": result["research_brief"],
                "methodology": "Open Deep Research multi-step workflow",
                "raw_notes": result["raw_notes"],  # Keep all raw notes for internal use
                "internal_agent_communications": result.get("messages", []),
                "tool_execution_logs": result.get("tool_calls", []),
                "debug_info": {
                    "trace_id": result.get("trace_id"),
                    "execution_metadata": result.get("trace_metadata", {})
                }
            }
            session.reasoning = raw_reasoning
            
            # Set LangSmith trace ID if available in config
            trace_id = result.get("trace_id")
            if trace_id:
                session.langsmith_trace_id = trace_id
                logger.info(f"LangSmith trace ID captured for session {session_id}: {trace_id}")
            elif hasattr(config, 'metadata') and config.metadata and config.metadata.get('trace_id'):
                # Fallback: get trace ID from config metadata
                session.langsmith_trace_id = config.metadata['trace_id']
                logger.info(f"LangSmith trace ID from config for session {session_id}: {config.metadata['trace_id']}")
            else:
                logger.warning(f"No LangSmith trace ID available for session {session_id}")
            
            session.save()
            
            # Track costs using the cost tracking service
            cost_record = None
            if session.langsmith_trace_id:
                cost_record = cost_tracking_service.track_research_costs(
                    trace_id=session.langsmith_trace_id,
                    session_id=str(session.id)
                )
            else:
                # Fallback: create cost record with estimated usage
                cost_record = cost_tracking_service.track_research_costs(
                    trace_id=None,  # No trace ID available
                    session_id=str(session.id)
                )
            
            if cost_record:
                logger.info(f"Cost tracking completed for session {session_id}: ${cost_record.estimated_cost}")
            else:
                logger.warning(f"Cost tracking failed for session {session_id}")
                # Create minimal cost record as fallback
                ResearchCost.objects.get_or_create(
                    session=session,
                    defaults={
                        'input_tokens': 0,
                        'output_tokens': 0,
                        'estimated_cost': 0.0
                    }
                )
            
            logger.info(f"Research execution completed successfully for session {session_id}")
            
            # Include trace information in response
            response_data = {
                "success": True,
                "session_id": str(session.id),
                "status": session.status,
                "summary": session.summary
            }
            
            # Add trace information for debugging
            if session.langsmith_trace_id:
                response_data["trace_id"] = session.langsmith_trace_id
                # Add trace URL if available
                trace_url = research_service.get_trace_url(session.langsmith_trace_id)
                if trace_url:
                    response_data["trace_url"] = trace_url
            
            return response_data
            
        else:
            # Handle research failure
            session.mark_failed(result["error"])
            logger.error(f"Research execution failed for session {session_id}: {result['error']}")
            
            return {
                "success": False,
                "session_id": str(session.id),
                "error": result["error"]
            }
            
    except Exception as exc:
        logger.error(f"Unexpected error in research task for session {session_id}: {str(exc)}")
        
        # Update session status to failed
        try:
            session = ResearchSession.objects.get(id=session_id)
            session.mark_failed(f"Task execution error: {str(exc)}")
        except ResearchSession.DoesNotExist:
            pass
        
        # Retry the task if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying research task for session {session_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        
        return {
            "success": False,
            "session_id": session_id,
            "error": f"Task failed after {self.max_retries} retries: {str(exc)}"
        }


@shared_task
def cleanup_failed_sessions():
    """
    Periodic task to clean up sessions that have been stuck in PROCESSING state.
    This should be run periodically (e.g., every hour) to handle edge cases.
    """
    from datetime import timedelta
    
    # Find sessions that have been processing for more than 1 hour
    cutoff_time = timezone.now() - timedelta(hours=1)
    stuck_sessions = ResearchSession.objects.filter(
        status='PROCESSING',
        updated_at__lt=cutoff_time
    )
    
    count = 0
    for session in stuck_sessions:
        session.mark_failed("Session timeout - processing took too long")
        count += 1
        logger.warning(f"Marked stuck session {session.id} as failed due to timeout")
    
    logger.info(f"Cleaned up {count} stuck research sessions")
    return {"cleaned_sessions": count}


@shared_task
def validate_research_environment():
    """
    Task to validate that the research environment is properly configured.
    Can be used for health checks.
    """
    validation_result = research_service.validate_configuration()
    
    if not validation_result["valid"]:
        logger.error(f"Research environment validation failed: {validation_result['errors']}")
    else:
        logger.info("Research environment validation passed")
    
    return validation_result