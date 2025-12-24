"""
Custom exception classes for the AI Research System.

This module defines custom exceptions that provide specific error handling
for different types of failures in the research system.
"""
from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


class ResearchSystemException(Exception):
    """Base exception class for all research system errors."""
    
    def __init__(self, message: str, error_code: str = None, details: dict = None):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(ResearchSystemException):
    """Raised when input validation fails."""
    
    def __init__(self, message: str, field: str = None, value=None, **kwargs):
        super().__init__(message, **kwargs)
        if field:
            self.details['field'] = field
        if value is not None:
            self.details['invalid_value'] = str(value)


class AuthenticationError(ResearchSystemException):
    """Raised when authentication fails."""
    pass


class AuthorizationError(ResearchSystemException):
    """Raised when user lacks permission for an operation."""
    
    def __init__(self, message: str, required_permission: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if required_permission:
            self.details['required_permission'] = required_permission


class ResearchExecutionError(ResearchSystemException):
    """Raised when research execution fails."""
    
    def __init__(self, message: str, session_id: str = None, trace_id: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if session_id:
            self.details['session_id'] = session_id
        if trace_id:
            self.details['trace_id'] = trace_id


class FileProcessingError(ResearchSystemException):
    """Raised when file processing fails."""
    
    def __init__(self, message: str, filename: str = None, file_type: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if filename:
            self.details['filename'] = filename
        if file_type:
            self.details['file_type'] = file_type


class FileValidationError(FileProcessingError):
    """Raised when file validation fails."""
    
    def __init__(self, message: str, validation_type: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if validation_type:
            self.details['validation_type'] = validation_type


class FileSizeError(FileValidationError):
    """Raised when file size exceeds limits."""
    
    def __init__(self, message: str, file_size: int = None, max_size: int = None, **kwargs):
        super().__init__(message, validation_type='file_size', **kwargs)
        if file_size is not None:
            self.details['file_size'] = file_size
        if max_size is not None:
            self.details['max_size'] = max_size


class UnsupportedFileTypeError(FileValidationError):
    """Raised when file type is not supported."""
    
    def __init__(self, message: str, mime_type: str = None, supported_types: list = None, **kwargs):
        super().__init__(message, validation_type='file_type', **kwargs)
        if mime_type:
            self.details['mime_type'] = mime_type
        if supported_types:
            self.details['supported_types'] = supported_types


class ResourceNotFoundError(ResearchSystemException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, message: str, resource_type: str = None, resource_id: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if resource_type:
            self.details['resource_type'] = resource_type
        if resource_id:
            self.details['resource_id'] = resource_id


class ResearchSessionNotFoundError(ResourceNotFoundError):
    """Raised when a research session is not found."""
    
    def __init__(self, session_id: str, user_id: str = None):
        message = f"Research session {session_id} not found"
        if user_id:
            message += f" for user {user_id}"
        super().__init__(
            message=message,
            resource_type='research_session',
            resource_id=session_id
        )
        if user_id:
            self.details['user_id'] = user_id


class FileNotFoundError(ResourceNotFoundError):
    """Raised when a file is not found."""
    
    def __init__(self, file_id: str, session_id: str = None):
        message = f"File {file_id} not found"
        if session_id:
            message += f" in session {session_id}"
        super().__init__(
            message=message,
            resource_type='research_file',
            resource_id=file_id
        )
        if session_id:
            self.details['session_id'] = session_id


class CostTrackingError(ResearchSystemException):
    """Raised when cost tracking operations fail."""
    
    def __init__(self, message: str, session_id: str = None, provider: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if session_id:
            self.details['session_id'] = session_id
        if provider:
            self.details['provider'] = provider


class LangSmithError(ResearchSystemException):
    """Raised when LangSmith operations fail."""
    
    def __init__(self, message: str, trace_id: str = None, operation: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if trace_id:
            self.details['trace_id'] = trace_id
        if operation:
            self.details['operation'] = operation


class ConfigurationError(ResearchSystemException):
    """Raised when system configuration is invalid."""
    
    def __init__(self, message: str, config_key: str = None, **kwargs):
        super().__init__(message, **kwargs)
        if config_key:
            self.details['config_key'] = config_key


class RateLimitError(ResearchSystemException):
    """Raised when rate limits are exceeded."""
    
    def __init__(self, message: str, limit_type: str = None, retry_after: int = None, **kwargs):
        super().__init__(message, **kwargs)
        if limit_type:
            self.details['limit_type'] = limit_type
        if retry_after:
            self.details['retry_after'] = retry_after


class ExternalServiceError(ResearchSystemException):
    """Raised when external service calls fail."""
    
    def __init__(self, message: str, service_name: str = None, status_code: int = None, **kwargs):
        super().__init__(message, **kwargs)
        if service_name:
            self.details['service_name'] = service_name
        if status_code:
            self.details['status_code'] = status_code


def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    
    This handler provides consistent error responses for all custom exceptions
    and logs errors appropriately for debugging and monitoring.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Handle custom exceptions
    if isinstance(exc, ResearchSystemException):
        # Log the error with context
        request = context.get('request')
        user_id = getattr(request.user, 'username', 'anonymous') if request and hasattr(request, 'user') else 'unknown'
        
        logger.error(
            f"ResearchSystemException: {exc.error_code} - {exc.message}",
            extra={
                'error_code': exc.error_code,
                'user_id': user_id,
                'details': exc.details,
                'request_path': request.path if request else None,
                'request_method': request.method if request else None,
            }
        )
        
        # Determine HTTP status code based on exception type
        status_code = _get_status_code_for_exception(exc)
        
        # Create consistent error response
        error_response = {
            'error': {
                'code': exc.error_code,
                'message': exc.message,
                'details': exc.details
            }
        }
        
        # Add additional context for specific error types
        if isinstance(exc, ValidationError):
            error_response['error']['type'] = 'validation_error'
        elif isinstance(exc, AuthenticationError):
            error_response['error']['type'] = 'authentication_error'
        elif isinstance(exc, AuthorizationError):
            error_response['error']['type'] = 'authorization_error'
        elif isinstance(exc, ResourceNotFoundError):
            error_response['error']['type'] = 'resource_not_found'
        elif isinstance(exc, FileProcessingError):
            error_response['error']['type'] = 'file_processing_error'
        elif isinstance(exc, ResearchExecutionError):
            error_response['error']['type'] = 'research_execution_error'
        elif isinstance(exc, ExternalServiceError):
            error_response['error']['type'] = 'external_service_error'
        else:
            error_response['error']['type'] = 'system_error'
        
        return Response(error_response, status=status_code)
    
    # Handle other exceptions with enhanced logging
    if response is not None:
        request = context.get('request')
        user_id = getattr(request.user, 'username', 'anonymous') if request and hasattr(request, 'user') else 'unknown'
        
        logger.error(
            f"API Exception: {exc.__class__.__name__} - {str(exc)}",
            extra={
                'exception_type': exc.__class__.__name__,
                'user_id': user_id,
                'request_path': request.path if request else None,
                'request_method': request.method if request else None,
                'response_status': response.status_code,
            }
        )
    
    return response


def _get_status_code_for_exception(exc: ResearchSystemException) -> int:
    """
    Determine appropriate HTTP status code for custom exceptions.
    
    Args:
        exc: The custom exception instance
        
    Returns:
        HTTP status code
    """
    if isinstance(exc, ValidationError):
        return status.HTTP_400_BAD_REQUEST
    elif isinstance(exc, AuthenticationError):
        return status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, AuthorizationError):
        return status.HTTP_403_FORBIDDEN
    elif isinstance(exc, ResourceNotFoundError):
        return status.HTTP_404_NOT_FOUND
    elif isinstance(exc, FileSizeError):
        return status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    elif isinstance(exc, UnsupportedFileTypeError):
        return status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    elif isinstance(exc, RateLimitError):
        return status.HTTP_429_TOO_MANY_REQUESTS
    elif isinstance(exc, (FileProcessingError, ResearchExecutionError, CostTrackingError, 
                          LangSmithError, ConfigurationError, ExternalServiceError)):
        return status.HTTP_500_INTERNAL_SERVER_ERROR
    else:
        return status.HTTP_500_INTERNAL_SERVER_ERROR