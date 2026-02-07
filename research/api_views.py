"""
API views that match the exact endpoint specifications.
"""
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import ResearchSession
from .serializers import (
    ResearchSessionCreateSerializer,
    ResearchSessionDetailSerializer,
    ResearchSessionListSerializer
)
from .views import ResearchSessionViewSet
from files.views import manage_session_files
from .exceptions import ValidationError, ResearchSessionNotFoundError
from .validators import validate_uuid, validate_user_id
import logging

logger = logging.getLogger(__name__)

# Use AllowAny for development, IsAuthenticated for production
PERMISSION_CLASS = AllowAny if settings.DEBUG else IsAuthenticated


@api_view(['POST'])
@permission_classes([PERMISSION_CLASS])
def start_research(request):
    """
    Start a new research session.
    
    POST /api/research/start
    Body: {
        "query": "string",
        "parent_research_id": "optional"
    }
    """
    try:
        # Map parent_research_id to parent_session_id for compatibility
        data = request.data.copy()
        if 'parent_research_id' in data:
            data['parent_session_id'] = data.pop('parent_research_id')
        
        # For development without authentication, use a default user
        if settings.DEBUG and not request.user.is_authenticated:
            # Create a mock user for development
            from django.contrib.auth.models import AnonymousUser
            class MockUser:
                username = 'dev_user'
                id = 1
                is_authenticated = True
            request.user = MockUser()
        
        serializer = ResearchSessionCreateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            session = serializer.save()
            
            # Return detailed response
            response_serializer = ResearchSessionDetailSerializer(session)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error starting research: {e}")
        return Response(
            {'error': 'Failed to start research session'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([PERMISSION_CLASS])
@parser_classes([MultiPartParser, FormParser])
def upload_context_file(request, research_id):
    """
    Upload a context file to a research session.
    
    POST /api/research/{research_id}/upload
    """
    try:
        # Validate research_id
        validate_uuid(research_id, 'research_id')
        
        # Delegate to the existing file upload handler
        # Pass the request directly - it's already a DRF request
        return manage_session_files(request, research_id)
        
    except ValidationError as e:
        return Response(
            {'error': e.message}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error uploading file to research {research_id}: {e}")
        return Response(
            {'error': 'Failed to upload file'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([PERMISSION_CLASS])
def continue_research(request, research_id):
    """
    Continue research from a previous session.
    
    POST /api/research/{research_id}/continue
    Body: {
        "query": "string"
    }
    """
    try:
        # For development without authentication, use a default user
        if settings.DEBUG and not request.user.is_authenticated:
            class MockUser:
                username = 'dev_user'
                id = 1
                is_authenticated = True
            request.user = MockUser()
        
        # Validate research_id
        validate_uuid(research_id, 'research_id')
        user_id = validate_user_id(request.user.username or str(request.user.id))
        
        # Check if parent session exists and belongs to user
        try:
            parent_session = ResearchSession.objects.get(id=research_id, user_id=user_id)
        except ResearchSession.DoesNotExist:
            raise ResearchSessionNotFoundError(research_id, user_id)
        
        # Validate that parent session is completed
        if parent_session.status != 'COMPLETED':
            return Response(
                {'error': f'Can only continue from completed research sessions. Current status: {parent_session.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate new query
        query = request.data.get('query')
        if not query:
            return Response(
                {'error': 'New research query is required for continuation'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create continuation data
        continuation_data = {
            'query': query,
            'parent_session_id': research_id
        }
        
        serializer = ResearchSessionCreateSerializer(data=continuation_data, context={'request': request})
        if serializer.is_valid():
            new_session = serializer.save()
            
            # Return detailed response
            response_serializer = ResearchSessionDetailSerializer(new_session)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except (ValidationError, ResearchSessionNotFoundError) as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error continuing research from {research_id}: {e}")
        return Response(
            {'error': 'Failed to continue research'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([PERMISSION_CLASS])
def research_history(request):
    """
    Get research history for the authenticated user.
    
    GET /api/research/history
    """
    try:
        # For development without authentication, use a default user
        if settings.DEBUG and not request.user.is_authenticated:
            class MockUser:
                username = 'dev_user'
                id = 1
                is_authenticated = True
            request.user = MockUser()
        
        user_id = validate_user_id(request.user.username or str(request.user.id))
        
        # Get all research sessions for the user
        sessions = ResearchSession.objects.filter(user_id=user_id).select_related('cost').prefetch_related('files').order_by('-created_at')
        
        # Apply pagination if needed
        page = request.query_params.get('page')
        page_size = request.query_params.get('page_size', 20)
        
        # For now, return all sessions (pagination can be added later)
        serializer = ResearchSessionListSerializer(sessions, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })
        
    except ValidationError as e:
        return Response(
            {'error': e.message}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error getting research history: {e}")
        return Response(
            {'error': 'Failed to get research history'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([PERMISSION_CLASS])
def research_details(request, research_id):
    """
    Get detailed information about a specific research session.
    
    GET /api/research/{research_id}
    
    Response includes:
    - report
    - summary  
    - reasoning
    - sources
    - token usage
    - cost
    - trace_id
    """
    try:
        # For development without authentication, use a default user
        if settings.DEBUG and not request.user.is_authenticated:
            class MockUser:
                username = 'dev_user'
                id = 1
                is_authenticated = True
            request.user = MockUser()
        
        # Validate research_id
        validate_uuid(research_id, 'research_id')
        user_id = validate_user_id(request.user.username or str(request.user.id))
        
        # Get the research session
        try:
            session = ResearchSession.objects.select_related('cost').prefetch_related('files').get(
                id=research_id, 
                user_id=user_id
            )
        except ResearchSession.DoesNotExist:
            raise ResearchSessionNotFoundError(research_id, user_id)
        
        # Serialize the session with all details
        serializer = ResearchSessionDetailSerializer(session)
        data = serializer.data
        
        # Ensure all required fields are present
        response_data = {
            'id': data.get('id'),
            'query': data.get('query'),
            'status': data.get('status'),
            'report': data.get('report', ''),
            'summary': data.get('summary', ''),
            'reasoning': data.get('reasoning', {}),
            'sources': data.get('files', []),  # Files serve as sources
            'token_usage': {
                'input_tokens': data.get('cost', {}).get('input_tokens', 0),
                'output_tokens': data.get('cost', {}).get('output_tokens', 0),
                'total_tokens': data.get('cost', {}).get('total_tokens', 0)
            } if data.get('cost') else None,
            'cost': {
                'estimated_cost': data.get('cost', {}).get('estimated_cost', 0),
                'currency': data.get('cost', {}).get('currency', 'USD')
            } if data.get('cost') else None,
            'trace_id': data.get('langsmith_trace_id'),
            'trace_url': data.get('trace_url'),
            'created_at': data.get('created_at'),
            'completed_at': data.get('completed_at'),
            'duration': data.get('duration'),
            'files': data.get('files', []),
            'is_continuation': data.get('is_continuation', False),
            'parent_session_id': data.get('parent_session_id')
        }
        
        return Response(response_data)
        
    except (ValidationError, ResearchSessionNotFoundError) as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error getting research details for {research_id}: {e}")
        return Response(
            {'error': 'Failed to get research details'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )