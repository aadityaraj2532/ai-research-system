"""
Views for file management in the AI Research System.
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from research.models import ResearchSession, ResearchFile
from research.exceptions import (
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ResearchSessionNotFoundError,
    FileNotFoundError,
    FileProcessingError,
    FileValidationError,
    FileSizeError,
    UnsupportedFileTypeError
)
from research.validators import validate_user_id, validate_uuid
from .serializers import (
    FileUploadSerializer, 
    ResearchFileDetailSerializer, 
    ResearchFileListSerializer
)
from .services import file_service
import logging

logger = logging.getLogger(__name__)


@api_view(['POST', 'GET'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def manage_session_files(request, session_id):
    """
    Manage files for a research session with comprehensive validation.
    
    POST /api/research/{session_id}/files/ - Upload a file
    GET /api/research/{session_id}/files/ - List all files
    """
    try:
        # Validate authentication
        if not request.user.is_authenticated:
            raise AuthenticationError("User must be authenticated to manage files")
        
        user = request.user
        user_id = validate_user_id(user.username or str(user.id))
        
        # Validate session ID
        validate_uuid(session_id, 'session_id')
        
        # Get research session with user validation
        try:
            session = ResearchSession.objects.get(id=session_id, user_id=user_id)
        except ResearchSession.DoesNotExist:
            raise ResearchSessionNotFoundError(session_id, user_id)
        
        # Log the request
        logger.info(f"User {user_id} managing files for session {session_id}", extra={
            'user_id': user_id,
            'session_id': session_id,
            'method': request.method,
            'action': 'manage_files'
        })
        
        if request.method == 'POST':
            return _upload_file(request, session, user_id)
        elif request.method == 'GET':
            return _list_session_files(request, session, user_id)
            
    except (ValidationError, AuthenticationError, ResearchSessionNotFoundError, 
            FileSizeError, UnsupportedFileTypeError, FileValidationError):
        raise
    except Exception as e:
        logger.error(f"Error managing files for session {session_id}: {e}")
        raise FileProcessingError("Failed to manage session files")


def _upload_file(request, session, user_id):
    """Handle file upload with comprehensive validation."""
    try:
        # Validate request data
        serializer = FileUploadSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationError(
                "Invalid file upload request", 
                details=serializer.errors
            )
        
        uploaded_file = serializer.validated_data.get('file')
        
        # Additional file validation
        if not uploaded_file:
            raise ValidationError("No file provided", field="file")
        
        if not uploaded_file.name:
            raise ValidationError("File must have a name", field="file")
        
        # Check file size
        if uploaded_file.size > file_service.MAX_FILE_SIZE:
            raise FileSizeError(
                f"File size ({uploaded_file.size} bytes) exceeds maximum allowed size",
                file_size=uploaded_file.size,
                max_size=file_service.MAX_FILE_SIZE,
                filename=uploaded_file.name
            )
        
        # Log upload attempt
        logger.info(f"User {user_id} uploading file {uploaded_file.name} to session {session.id}", extra={
            'user_id': user_id,
            'session_id': str(session.id),
            'file_name': uploaded_file.name,
            'file_size': uploaded_file.size,
            'action': 'file_upload'
        })
        
        # Process the uploaded file with transaction
        with transaction.atomic():
            research_file = file_service.process_uploaded_file(uploaded_file, session)
            
            # Log successful upload
            logger.info(f"File {uploaded_file.name} uploaded successfully", extra={
                'user_id': user_id,
                'session_id': str(session.id),
                'file_id': str(research_file.id),
                'file_name': uploaded_file.name,
                'action': 'file_uploaded'
            })
            
            # Return file details
            response_serializer = ResearchFileDetailSerializer(research_file)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except (ValidationError, FileSizeError, UnsupportedFileTypeError):
        raise
    except ValueError as e:
        # File validation or processing error from service
        raise FileValidationError(str(e), filename=getattr(uploaded_file, 'name', 'unknown'))
    except Exception as e:
        # Unexpected error
        logger.error(f'File upload error for session {session.id}: {e}', extra={
            'user_id': user_id,
            'session_id': str(session.id),
            'file_name': getattr(uploaded_file, 'name', 'unknown'),
            'error': str(e)
        })
        raise FileProcessingError(
            "Internal server error during file upload",
            filename=getattr(uploaded_file, 'name', 'unknown')
        )


def _list_session_files(request, session, user_id):
    """Handle listing session files with validation."""
    try:
        # Get all files for the session
        files = session.files.all().order_by('-uploaded_at')
        
        # Log the request
        logger.info(f"User {user_id} listing files for session {session.id}", extra={
            'user_id': user_id,
            'session_id': str(session.id),
            'file_count': files.count(),
            'action': 'list_files'
        })
        
        # Serialize and return
        serializer = ResearchFileListSerializer(files, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error listing files for session {session.id}: {e}")
        raise FileProcessingError("Failed to list session files")


@api_view(['GET', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def manage_file(request, session_id, file_id):
    """
    Manage a specific file with comprehensive validation.
    
    GET /api/research/{session_id}/files/{file_id}/ - Get file details
    DELETE /api/research/{session_id}/files/{file_id}/ - Delete file
    """
    try:
        # Validate authentication
        if not request.user.is_authenticated:
            raise AuthenticationError("User must be authenticated to manage files")
        
        user = request.user
        user_id = validate_user_id(user.username or str(user.id))
        
        # Validate IDs
        validate_uuid(session_id, 'session_id')
        validate_uuid(file_id, 'file_id')
        
        # Get research session with user validation
        try:
            session = ResearchSession.objects.get(id=session_id, user_id=user_id)
        except ResearchSession.DoesNotExist:
            raise ResearchSessionNotFoundError(session_id, user_id)
        
        # Get specific file
        try:
            research_file = ResearchFile.objects.get(id=file_id, session=session)
        except ResearchFile.DoesNotExist:
            raise FileNotFoundError(file_id, session_id)
        
        # Log the request
        logger.info(f"User {user_id} managing file {file_id} in session {session_id}", extra={
            'user_id': user_id,
            'session_id': session_id,
            'file_id': file_id,
            'method': request.method,
            'action': 'manage_file'
        })
        
        if request.method == 'GET':
            return _get_file_details(request, research_file, user_id)
        elif request.method == 'DELETE':
            return _delete_file(request, research_file, user_id)
            
    except (ValidationError, AuthenticationError, ResearchSessionNotFoundError, FileNotFoundError):
        raise
    except Exception as e:
        logger.error(f"Error managing file {file_id} in session {session_id}: {e}")
        raise FileProcessingError("Failed to manage file")


def _get_file_details(request, research_file, user_id):
    """Handle getting file details with validation."""
    try:
        # Log the request
        logger.info(f"User {user_id} getting details for file {research_file.id}", extra={
            'user_id': user_id,
            'file_id': str(research_file.id),
            'file_name': research_file.filename,
            'action': 'get_file_details'
        })
        
        serializer = ResearchFileDetailSerializer(research_file)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error getting file details for {research_file.id}: {e}")
        raise FileProcessingError("Failed to get file details", filename=research_file.filename)


def _delete_file(request, research_file, user_id):
    """Handle file deletion with comprehensive validation and cleanup."""
    try:
        filename = research_file.filename
        file_id = research_file.id
        file_path = research_file.file_path
        
        # Log deletion attempt
        logger.warning(f"User {user_id} deleting file {file_id}", extra={
            'user_id': user_id,
            'file_id': str(file_id),
            'file_name': filename,  # Changed key
            'action': 'delete_file'
        })
        
        # Use transaction for atomic deletion
        with transaction.atomic():
            # Delete file from disk if it exists
            import os
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.info(f"File {filename} removed from disk", extra={
                        'file_name': filename,
                        'file_path': file_path,
                        'action': 'file_disk_cleanup'
                    })
                except OSError as e:
                    logger.warning(f"Could not remove file {filename} from disk: {e}", extra={
                        'file_name': filename,
                        'file_path': file_path,
                        'error': str(e)
                    })
                    # Continue with database deletion even if disk cleanup fails
            
            # Delete database record
            research_file.delete()
            
            # Log successful deletion
            logger.info(f"File {filename} deleted successfully", extra={
                'user_id': user_id,
                'file_id': str(file_id),
                'file_name': filename,  # Changed key
                'action': 'file_deleted'
            })
        
        return Response(status=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        # Get filename safely for logging
        filename_for_log = getattr(research_file, 'filename', 'unknown') if 'research_file' in locals() else 'unknown'
        file_id_for_log = getattr(research_file, 'id', 'unknown') if 'research_file' in locals() else 'unknown'
        
        logger.error(f'File deletion error for file {file_id_for_log}: {e}', extra={
            'user_id': user_id,
            'file_id': str(file_id_for_log),
            'file_name': filename_for_log,  # Changed key
            'error': str(e)
        })
        raise FileProcessingError(
            "Error deleting file",
            filename=filename_for_log
        )
