"""
Cost tracking service for capturing token usage and calculating costs from LangSmith.
"""
import os
import logging
from typing import Dict, Any, Optional, List
from decimal import Decimal
from django.utils import timezone
from datetime import datetime, timedelta

from research.models import ResearchSession, ResearchCost

# LangSmith imports
try:
    from langsmith import Client as LangSmithClient
    LANGSMITH_AVAILABLE = True
except ImportError:
    LANGSMITH_AVAILABLE = False
    LangSmithClient = None

logger = logging.getLogger(__name__)


class CostTrackingService:
    """
    Service for tracking AI usage costs and token consumption.
    
    This service integrates with LangSmith to capture token usage data
    and calculates estimated costs for different LLM providers.
    """
    
    # Cost per token rates (in USD) for different providers and models
    # These are approximate rates and should be updated based on current pricing
    TOKEN_RATES = {
        'openai': {
            'gpt-4o': {'input': 0.000005, 'output': 0.000015},  # $5/$15 per 1M tokens
            'gpt-4o-mini': {'input': 0.00000015, 'output': 0.0000006},  # $0.15/$0.60 per 1M tokens
            'gpt-4-turbo': {'input': 0.00001, 'output': 0.00003},  # $10/$30 per 1M tokens
            'gpt-4': {'input': 0.00003, 'output': 0.00006},  # $30/$60 per 1M tokens
        },
        'anthropic': {
            'claude-3-5-sonnet-20241022': {'input': 0.000003, 'output': 0.000015},  # $3/$15 per 1M tokens
            'claude-3-5-haiku-20241022': {'input': 0.00000025, 'output': 0.00000125},  # $0.25/$1.25 per 1M tokens
            'claude-3-opus': {'input': 0.000015, 'output': 0.000075},  # $15/$75 per 1M tokens
        },
        'google': {
            'gemini-pro': {'input': 0.0000005, 'output': 0.0000015},  # $0.50/$1.50 per 1M tokens
            'gemini-pro-vision': {'input': 0.00000025, 'output': 0.00000075},  # $0.25/$0.75 per 1M tokens
        }
    }
    
    def __init__(self):
        """Initialize the cost tracking service with LangSmith client."""
        self.langsmith_client = self._initialize_langsmith_client()
    
    def _initialize_langsmith_client(self) -> Optional[LangSmithClient]:
        """Initialize LangSmith client if available and configured."""
        if not LANGSMITH_AVAILABLE:
            logger.warning("LangSmith not available - cost tracking will use fallback methods")
            return None
        
        api_key = os.getenv('LANGCHAIN_API_KEY')
        if not api_key:
            logger.warning("LANGCHAIN_API_KEY not set - LangSmith cost tracking disabled")
            return None
        
        try:
            client = LangSmithClient(api_key=api_key)
            logger.info("LangSmith client initialized for cost tracking")
            return client
        except Exception as e:
            logger.error(f"Failed to initialize LangSmith client: {e}")
            return None
    
    def track_research_costs(self, trace_id: str, session_id: str) -> Optional[ResearchCost]:
        """
        Track costs for a research session using LangSmith trace data.
        
        Args:
            trace_id: LangSmith trace ID to analyze
            session_id: Research session ID to associate costs with
            
        Returns:
            ResearchCost object if successful, None otherwise
        """
        try:
            # Get the research session
            session = ResearchSession.objects.get(id=session_id)
        except ResearchSession.DoesNotExist:
            logger.error(f"Research session {session_id} not found for cost tracking")
            return None
        
        if self.langsmith_client and trace_id:
            # Get token usage from LangSmith trace
            token_usage = self._get_token_usage_from_trace(trace_id)
        else:
            # Fallback: estimate token usage based on content length
            token_usage = self._estimate_token_usage_fallback(session)
        
        # Calculate costs based on token usage
        provider_costs = self._calculate_provider_costs(token_usage)
        total_cost = sum(provider_costs.values())
        
        # Create or update cost record
        cost, created = ResearchCost.objects.update_or_create(
            session=session,
            defaults={
                'input_tokens': token_usage['input_tokens'],
                'output_tokens': token_usage['output_tokens'],
                'total_tokens': token_usage['input_tokens'] + token_usage['output_tokens'],
                'estimated_cost': Decimal(str(total_cost)),
                'provider_costs': provider_costs,
                'currency': 'USD'
            }
        )
        
        if created:
            logger.info(f"Created cost record for session {session_id}: ${total_cost:.4f}")
        else:
            logger.info(f"Updated cost record for session {session_id}: ${total_cost:.4f}")
        
        return cost
    
    def _get_token_usage_from_trace(self, trace_id: str) -> Dict[str, int]:
        """
        Extract token usage from LangSmith trace.
        
        Args:
            trace_id: LangSmith trace ID
            
        Returns:
            Dictionary with input_tokens, output_tokens, and model_usage breakdown
        """
        try:
            # Get the trace from LangSmith
            trace = self.langsmith_client.read_run(trace_id)
            
            # Initialize counters
            total_input_tokens = 0
            total_output_tokens = 0
            model_usage = {}
            
            # Recursively collect token usage from all runs in the trace
            def collect_tokens_from_run(run):
                nonlocal total_input_tokens, total_output_tokens, model_usage
                
                # Check if this run has token usage data
                if hasattr(run, 'usage_metadata') and run.usage_metadata:
                    usage = run.usage_metadata
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)
                    
                    total_input_tokens += input_tokens
                    total_output_tokens += output_tokens
                    
                    # Track usage by model if available
                    model_name = getattr(run, 'model_name', 'unknown')
                    if model_name not in model_usage:
                        model_usage[model_name] = {'input': 0, 'output': 0}
                    model_usage[model_name]['input'] += input_tokens
                    model_usage[model_name]['output'] += output_tokens
                
                # Check child runs recursively
                if hasattr(run, 'child_runs') and run.child_runs:
                    for child_run in run.child_runs:
                        collect_tokens_from_run(child_run)
            
            # Start collection from the root trace
            collect_tokens_from_run(trace)
            
            logger.info(f"Extracted token usage from trace {trace_id}: {total_input_tokens} input, {total_output_tokens} output")
            
            return {
                'input_tokens': total_input_tokens,
                'output_tokens': total_output_tokens,
                'model_usage': model_usage
            }
            
        except Exception as e:
            logger.error(f"Failed to extract token usage from trace {trace_id}: {e}")
            # Return zero usage as fallback
            return {
                'input_tokens': 0,
                'output_tokens': 0,
                'model_usage': {}
            }
    
    def _estimate_token_usage_fallback(self, session: ResearchSession) -> Dict[str, int]:
        """
        Estimate token usage when LangSmith data is not available.
        
        Args:
            session: Research session to estimate usage for
            
        Returns:
            Dictionary with estimated input_tokens and output_tokens
        """
        # Rough estimation: 1 token ≈ 4 characters for English text
        # This is a very rough approximation and should be improved
        
        query_length = len(session.query) if session.query else 0
        report_length = 0
        
        if session.report and isinstance(session.report, dict):
            final_report = session.report.get('final_report', '')
            report_length = len(final_report) if final_report else 0
        
        # Estimate input tokens (query + context + system prompts)
        estimated_input_tokens = max(1, (query_length + 2000) // 4)  # Add 2000 chars for system prompts
        
        # Estimate output tokens (generated report)
        estimated_output_tokens = max(1, report_length // 4)
        
        logger.info(f"Estimated token usage for session {session.id}: {estimated_input_tokens} input, {estimated_output_tokens} output (fallback)")
        
        return {
            'input_tokens': estimated_input_tokens,
            'output_tokens': estimated_output_tokens,
            'model_usage': {}
        }
    
    def _calculate_provider_costs(self, token_usage: Dict[str, int]) -> Dict[str, float]:
        """
        Calculate costs by provider based on token usage.
        
        Args:
            token_usage: Dictionary with token usage data
            
        Returns:
            Dictionary with costs by provider
        """
        provider_costs = {}
        model_usage = token_usage.get('model_usage', {})
        
        if model_usage:
            # Calculate costs based on actual model usage
            for model_name, usage in model_usage.items():
                provider, cost = self._calculate_model_cost(model_name, usage['input'], usage['output'])
                if provider in provider_costs:
                    provider_costs[provider] += cost
                else:
                    provider_costs[provider] = cost
        else:
            # Fallback: assume OpenAI GPT-4o for all usage
            input_tokens = token_usage['input_tokens']
            output_tokens = token_usage['output_tokens']
            
            if input_tokens > 0 or output_tokens > 0:
                _, cost = self._calculate_model_cost('openai:gpt-4o', input_tokens, output_tokens)
                provider_costs['openai'] = cost
        
        return provider_costs
    
    def _calculate_model_cost(self, model_name: str, input_tokens: int, output_tokens: int) -> tuple[str, float]:
        """
        Calculate cost for a specific model and token usage.
        
        Args:
            model_name: Model name (e.g., 'openai:gpt-4o' or 'gpt-4o')
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            
        Returns:
            Tuple of (provider, cost)
        """
        # Parse provider and model from model name
        if ':' in model_name:
            provider, model = model_name.split(':', 1)
        else:
            # Try to infer provider from model name
            if 'gpt' in model_name.lower():
                provider = 'openai'
                model = model_name
            elif 'claude' in model_name.lower():
                provider = 'anthropic'
                model = model_name
            elif 'gemini' in model_name.lower():
                provider = 'google'
                model = model_name
            else:
                # Default to OpenAI GPT-4o
                provider = 'openai'
                model = 'gpt-4o'
        
        # Get rates for this provider and model
        if provider in self.TOKEN_RATES and model in self.TOKEN_RATES[provider]:
            rates = self.TOKEN_RATES[provider][model]
            input_cost = input_tokens * rates['input']
            output_cost = output_tokens * rates['output']
            total_cost = input_cost + output_cost
        else:
            # Fallback to OpenAI GPT-4o rates
            logger.warning(f"No rates found for {provider}:{model}, using OpenAI GPT-4o rates")
            rates = self.TOKEN_RATES['openai']['gpt-4o']
            input_cost = input_tokens * rates['input']
            output_cost = output_tokens * rates['output']
            total_cost = input_cost + output_cost
        
        return provider, total_cost
    
    def calculate_estimated_cost(self, token_usage: Dict[str, Any]) -> Decimal:
        """
        Calculate estimated cost for given token usage.
        
        Args:
            token_usage: Dictionary with token usage information
            
        Returns:
            Estimated cost as Decimal
        """
        provider_costs = self._calculate_provider_costs(token_usage)
        total_cost = sum(provider_costs.values())
        return Decimal(str(total_cost))
    
    def get_user_total_costs(self, user_id: str, period: str = 'all') -> Dict[str, Any]:
        """
        Get total costs for a user within a specified period.
        
        Args:
            user_id: User identifier
            period: Time period ('day', 'week', 'month', 'year', 'all')
            
        Returns:
            Dictionary with cost summary
        """
        # Calculate date range based on period
        end_date = timezone.now()
        
        if period == 'day':
            start_date = end_date - timedelta(days=1)
        elif period == 'week':
            start_date = end_date - timedelta(weeks=1)
        elif period == 'month':
            start_date = end_date - timedelta(days=30)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
        else:  # 'all'
            start_date = None
        
        # Get user totals using the model method
        totals = ResearchCost.get_user_total_cost(user_id, start_date, end_date)
        
        # Add period information
        totals['period'] = period
        totals['start_date'] = start_date.isoformat() if start_date else None
        totals['end_date'] = end_date.isoformat()
        
        return totals
    
    def update_token_rates(self, new_rates: Dict[str, Dict[str, Dict[str, float]]]):
        """
        Update token rates for cost calculations.
        
        Args:
            new_rates: New rate structure matching TOKEN_RATES format
        """
        self.TOKEN_RATES.update(new_rates)
        logger.info("Updated token rates for cost calculations")
    
    def get_cost_breakdown_by_provider(self, user_id: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Get detailed cost breakdown by provider for a user.
        
        Args:
            user_id: User identifier
            start_date: Optional start date for filtering
            end_date: Optional end date for filtering
            
        Returns:
            Dictionary with provider breakdown
        """
        # Get all cost records for the user in the date range
        queryset = ResearchCost.objects.filter(session__user_id=user_id)
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        # Aggregate costs by provider
        provider_breakdown = {}
        total_cost = Decimal('0')
        total_tokens = 0
        
        for cost_record in queryset:
            total_cost += cost_record.estimated_cost
            total_tokens += cost_record.total_tokens
            
            # Process provider costs
            for provider, provider_cost in cost_record.provider_costs.items():
                if provider not in provider_breakdown:
                    provider_breakdown[provider] = {
                        'cost': 0.0,
                        'sessions': 0,
                        'tokens': 0
                    }
                
                provider_breakdown[provider]['cost'] += float(provider_cost)
                provider_breakdown[provider]['sessions'] += 1
                # Note: We don't have per-provider token counts, so we approximate
                provider_breakdown[provider]['tokens'] += cost_record.total_tokens
        
        return {
            'total_cost': float(total_cost),
            'total_tokens': total_tokens,
            'provider_breakdown': provider_breakdown,
            'period': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None
            }
        }


# Global service instance
cost_tracking_service = CostTrackingService()