"""
Django REST Framework serializers for the AI Research System.
"""
from rest_framework import serializers
from .models import ResearchSession, ResearchFile, ResearchCost
from .services import ReasoningService
from .exceptions import ValidationError
from .validators import validate_research_query, validate_uuid
import logging

logger = logging.getLogger(__name__)


class ResearchCostSerializer(serializers.ModelSerializer):
    """Serializer for research cost data."""
    
    cost_per_token = serializers.ReadOnlyField()
    
    class Meta:
        model = ResearchCost
        fields = [
            'input_tokens', 'output_tokens', 'total_tokens',
            'estimated_cost', 'cost_per_token', 'provider_costs',
            'currency', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ResearchFileSerializer(serializers.ModelSerializer):
    """Serializer for research file data."""
    
    file_size_mb = serializers.ReadOnlyField()
    
    class Meta:
        model = ResearchFile
        fields = [
            'id', 'filename', 'file_type', 'file_size', 'file_size_mb',
            'content_summary', 'is_processed', 'processing_error',
            'uploaded_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'file_size_mb', 'is_processed', 'processing_error',
            'uploaded_at', 'processed_at'
        ]


class ResearchSessionListSerializer(serializers.ModelSerializer):
    """Serializer for research session list view (minimal data)."""
    
    duration = serializers.ReadOnlyField()
    is_continuation = serializers.ReadOnlyField()
    file_count = serializers.SerializerMethodField()
    cost = ResearchCostSerializer(read_only=True)
    token_usage = serializers.SerializerMethodField()
    
    class Meta:
        model = ResearchSession
        fields = [
            'id', 'query', 'status', 'summary', 'duration',
            'is_continuation', 'file_count', 'cost', 'token_usage',
            'created_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'completed_at']
    
    def get_file_count(self, obj):
        """Get the number of files associated with this session."""
        return obj.files.count()
    
    def get_token_usage(self, obj):
        """Get token usage from cost record."""
        try:
            cost = obj.cost
            return {
                'total_tokens': cost.total_tokens,
                'input_tokens': cost.input_tokens,
                'output_tokens': cost.output_tokens
            }
        except:
            return {'total_tokens': 0, 'input_tokens': 0, 'output_tokens': 0}


class ResearchSessionDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed research session view."""
    
    duration = serializers.ReadOnlyField()
    is_continuation = serializers.ReadOnlyField()
    files = ResearchFileSerializer(many=True, read_only=True)
    cost = ResearchCostSerializer(read_only=True)
    parent_session_id = serializers.UUIDField(source='parent_session.id', read_only=True)
    child_sessions_count = serializers.SerializerMethodField()
    trace_url = serializers.SerializerMethodField()
    reasoning = serializers.SerializerMethodField()
    
    class Meta:
        model = ResearchSession
        fields = [
            'id', 'user_id', 'query', 'status', 'report', 'summary',
            'reasoning', 'duration', 'is_continuation', 'parent_session_id',
            'child_sessions_count', 'langsmith_trace_id', 'trace_url', 'files', 'cost',
            'created_at', 'completed_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_id', 'status', 'report', 'summary', 'reasoning',
            'duration', 'is_continuation', 'parent_session_id', 'child_sessions_count',
            'langsmith_trace_id', 'trace_url', 'files', 'cost', 'created_at', 'completed_at', 'updated_at'
        ]
    
    def get_reasoning(self, obj):
        """Get filtered reasoning data safe for user consumption."""
        try:
            reasoning_service = ReasoningService()
            filtered_reasoning = reasoning_service.get_user_reasoning(obj)
            return reasoning_service.format_reasoning_for_api(filtered_reasoning)
        except Exception as e:
            logger.error(f"Error formatting reasoning for session {obj.id}: {e}")
            return {
                'research_brief': 'Reasoning information unavailable',
                'methodology': 'Standard research workflow'
            }
    
    def get_child_sessions_count(self, obj):
        """Get the number of child sessions (continuations)."""
        try:
            return obj.child_sessions.count()
        except Exception as e:
            logger.error(f"Error getting child sessions count for session {obj.id}: {e}")
            return 0
    
    def get_trace_url(self, obj):
        """Get the LangSmith trace URL for debugging."""
        try:
            if obj.langsmith_trace_id:
                from .services import research_service
                return research_service.get_trace_url(obj.langsmith_trace_id)
            return None
        except Exception as e:
            logger.error(f"Error generating trace URL for session {obj.id}: {e}")
            return None


class ResearchSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new research sessions with comprehensive validation."""
    
    parent_session_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = ResearchSession
        fields = ['id', 'query', 'status', 'user_id', 'parent_session_id', 'created_at']
        read_only_fields = ['id', 'status', 'user_id', 'created_at']
    
    def validate_query(self, value):
        """Validate research query with comprehensive checks."""
        try:
            return validate_research_query(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.message)
    
    def validate_parent_session_id(self, value):
        """Validate that parent session exists and belongs to the user."""
        if value is not None:
            try:
                # Validate UUID format
                validate_uuid(str(value), 'parent_session_id')
                
                # Get user from context
                request = self.context.get('request')
                if not request or not request.user.is_authenticated:
                    raise serializers.ValidationError("Authentication required to validate parent session")
                
                user_id = request.user.username or str(request.user.id)
                
                # Check if parent session exists and belongs to user
                try:
                    parent_session = ResearchSession.objects.get(id=value, user_id=user_id)
                    
                    # Validate parent session status
                    if parent_session.status != 'COMPLETED':
                        raise serializers.ValidationError(
                            f"Parent session must be completed. Current status: {parent_session.status}"
                        )
                    
                    return parent_session
                    
                except ResearchSession.DoesNotExist:
                    raise serializers.ValidationError(
                        "Parent session not found or does not belong to the current user."
                    )
                    
            except ValidationError as e:
                raise serializers.ValidationError(e.message)
            except Exception as e:
                logger.error(f"Error validating parent session {value}: {e}")
                raise serializers.ValidationError("Error validating parent session")
        
        return None
    
    def validate(self, attrs):
        """Perform cross-field validation."""
        # Additional validation can be added here
        query = attrs.get('query', '')
        parent_session = attrs.get('parent_session_id')
        
        # If this is a continuation, ensure the query is different from parent
        if parent_session and hasattr(parent_session, 'query'):
            if query.strip().lower() == parent_session.query.strip().lower():
                raise serializers.ValidationError({
                    'query': 'Continuation query should be different from the parent session query'
                })
        
        return attrs
    
    def create(self, validated_data):
        """Create a new research session with proper error handling."""
        try:
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError("Authentication required to create research session")
            
            user = request.user
            user_id = user.username or str(user.id)
            
            parent_session = validated_data.pop('parent_session_id', None)
            
            # Log session creation
            logger.info(f"Creating research session for user {user_id}", extra={
                'user_id': user_id,
                'has_parent': bool(parent_session),
                'query_length': len(validated_data.get('query', ''))
            })
            
            research_session = ResearchSession.objects.create(
                user_id=user_id,
                parent_session=parent_session,
                **validated_data
            )
            
            # Trigger the research execution task
            from .tasks import execute_research_task
            execute_research_task.delay(str(research_session.id))
            logger.info(f"Research task queued for session {research_session.id}")
            
            return research_session
            
        except Exception as e:
            logger.error(f"Error creating research session: {e}")
            raise serializers.ValidationError("Failed to create research session")


class ResearchSessionStatusSerializer(serializers.ModelSerializer):
    """Serializer for research session status information."""
    
    duration = serializers.ReadOnlyField()
    trace_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ResearchSession
        fields = [
            'id', 'status', 'duration', 'langsmith_trace_id', 'trace_url',
            'created_at', 'completed_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'completed_at', 'updated_at']
    
    def get_trace_url(self, obj):
        """Get the LangSmith trace URL for debugging."""
        try:
            if obj.langsmith_trace_id:
                from .services import research_service
                return research_service.get_trace_url(obj.langsmith_trace_id)
            return None
        except Exception as e:
            logger.error(f"Error generating trace URL for session {obj.id}: {e}")
            return None