"""
Views for the research app providing REST API endpoints.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import ResearchSession
from .serializers import (
    ResearchSessionListSerializer,
    ResearchSessionDetailSerializer,
    ResearchSessionCreateSerializer,
    ResearchSessionStatusSerializer
)
from .exceptions import (
    ValidationError,
    AuthenticationError,
    ResearchSessionNotFoundError,
    ResearchExecutionError
)
from .validators import (
    validate_research_query,
    validate_user_id,
    validate_uuid,
    InputValidator
)
import logging

logger = logging.getLogger(__name__)


class ResearchSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing research sessions with continuation support.
    
    Provides CRUD operations for research sessions plus additional actions
    for status checking and research continuation functionality.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get research sessions filtered by current user with validation."""
        try:
            user = self.request.user
            if not user.is_authenticated:
                raise AuthenticationError("User must be authenticated to access research sessions")
            
            user_id = validate_user_id(user.username or str(user.id))
            
            return ResearchSession.objects.filter(user_id=user_id).select_related('cost').prefetch_related('files')
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error getting queryset for user {getattr(user, 'username', 'unknown')}: {e}")
            raise ResearchExecutionError("Failed to retrieve research sessions")
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action."""
        if self.action == 'list':
            return ResearchSessionListSerializer
        elif self.action == 'create':
            return ResearchSessionCreateSerializer
        elif self.action == 'status':
            return ResearchSessionStatusSerializer
        else:
            return ResearchSessionDetailSerializer
    
    def list(self, request, *args, **kwargs):
        """List research sessions with pagination validation."""
        try:
            # Validate pagination parameters
            page = request.query_params.get('page')
            page_size = request.query_params.get('page_size')
            
            pagination_params = InputValidator.validate_pagination_params(page, page_size)
            
            return super().list(request, *args, **kwargs)
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error listing research sessions: {e}")
            raise ResearchExecutionError("Failed to list research sessions")
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific research session with validation."""
        try:
            # Validate session ID
            session_id = kwargs.get('pk')
            validate_uuid(session_id, 'session_id')
            
            user_id = validate_user_id(request.user.username or str(request.user.id))
            
            # Check if session exists and belongs to user
            try:
                session = self.get_queryset().get(id=session_id)
            except ResearchSession.DoesNotExist:
                raise ResearchSessionNotFoundError(session_id, user_id)
            
            return super().retrieve(request, *args, **kwargs)
            
        except (ValidationError, ResearchSessionNotFoundError):
            raise
        except Exception as e:
            logger.error(f"Error retrieving research session {session_id}: {e}")
            raise ResearchExecutionError(f"Failed to retrieve research session", session_id=session_id)
    
    def create(self, request, *args, **kwargs):
        """Create a new research session with comprehensive validation."""
        try:
            user = request.user
            if not user.is_authenticated:
                raise AuthenticationError("User must be authenticated to create research sessions")
            
            user_id = validate_user_id(user.username or str(user.id))
            
            # Validate request data
            if not request.data:
                raise ValidationError("Request data is required")
            
            # Validate query
            query = request.data.get('query')
            if not query:
                raise ValidationError("Research query is required", field="query")
            
            validated_query = validate_research_query(query)
            
            # Use transaction to ensure atomicity
            with transaction.atomic():
                response = super().create(request, *args, **kwargs)
                return response
                
        except (ValidationError, AuthenticationError, ResearchSessionNotFoundError):
            raise
        except Exception as e:
            logger.error(f"Error creating research session for user {user_id}: {e}")
            raise ResearchExecutionError("Failed to create research session")
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get research session status with validation."""
        try:
            validate_uuid(pk, 'session_id')
            user_id = validate_user_id(request.user.username or str(request.user.id))
            
            # Check if session exists and belongs to user
            try:
                session = self.get_queryset().get(id=pk)
            except ResearchSession.DoesNotExist:
                raise ResearchSessionNotFoundError(pk, user_id)
            
            serializer = self.get_serializer(session)
            return Response(serializer.data)
            
        except (ValidationError, ResearchSessionNotFoundError):
            raise
        except Exception as e:
            logger.error(f"Error getting status for session {pk}: {e}")
            raise ResearchExecutionError(f"Failed to get session status", session_id=pk)