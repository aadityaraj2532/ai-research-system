"""
Input validation utilities for the AI Research System.

This module provides comprehensive validation functions for API inputs,
ensuring data integrity and security across all endpoints.
"""
import re
import uuid
from typing import Any, Dict, List, Optional, Union
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from .exceptions import ValidationError


class InputValidator:
    """Comprehensive input validation for research system."""
    
    # Query validation constants
    MIN_QUERY_LENGTH = 10
    MAX_QUERY_LENGTH = 5000
    
    # User ID validation
    MAX_USER_ID_LENGTH = 255
    
    # File validation constants
    MAX_FILENAME_LENGTH = 255
    ALLOWED_FILE_EXTENSIONS = {'.pdf', '.txt', '.docx', '.doc'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Research session validation
    VALID_STATUSES = {'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'}
    
    @staticmethod
    def validate_research_query(query: str) -> str:
        """
        Validate research query input.
        
        Args:
            query: Research query string
            
        Returns:
            Cleaned query string
            
        Raises:
            ValidationError: If query is invalid
        """
        if not query:
            raise ValidationError("Research query is required", field="query")
        
        if not isinstance(query, str):
            raise ValidationError("Research query must be a string", field="query", value=type(query).__name__)
        
        # Clean whitespace
        query = query.strip()
        
        if len(query) < InputValidator.MIN_QUERY_LENGTH:
            raise ValidationError(
                f"Research query must be at least {InputValidator.MIN_QUERY_LENGTH} characters long",
                field="query",
                value=len(query)
            )
        
        if len(query) > InputValidator.MAX_QUERY_LENGTH:
            raise ValidationError(
                f"Research query must not exceed {InputValidator.MAX_QUERY_LENGTH} characters",
                field="query",
                value=len(query)
            )
        
        # Check for potentially malicious content
        if InputValidator._contains_suspicious_content(query):
            raise ValidationError(
                "Research query contains potentially unsafe content",
                field="query"
            )
        
        return query
    
    @staticmethod
    def validate_user_id(user_id: str) -> str:
        """
        Validate user ID input.
        
        Args:
            user_id: User identifier
            
        Returns:
            Cleaned user ID
            
        Raises:
            ValidationError: If user ID is invalid
        """
        if not user_id:
            raise ValidationError("User ID is required", field="user_id")
        
        if not isinstance(user_id, str):
            raise ValidationError("User ID must be a string", field="user_id", value=type(user_id).__name__)
        
        user_id = user_id.strip()
        
        if len(user_id) > InputValidator.MAX_USER_ID_LENGTH:
            raise ValidationError(
                f"User ID must not exceed {InputValidator.MAX_USER_ID_LENGTH} characters",
                field="user_id",
                value=len(user_id)
            )
        
        # Basic sanitization - remove potentially dangerous characters
        if not re.match(r'^[a-zA-Z0-9._@-]+$', user_id):
            raise ValidationError(
                "User ID contains invalid characters. Only alphanumeric, dots, underscores, @ and hyphens are allowed",
                field="user_id",
                value=user_id
            )
        
        return user_id
    
    @staticmethod
    def validate_uuid(uuid_string: str, field_name: str = "id") -> uuid.UUID:
        """
        Validate UUID string.
        
        Args:
            uuid_string: UUID string to validate
            field_name: Name of the field for error reporting
            
        Returns:
            UUID object
            
        Raises:
            ValidationError: If UUID is invalid
        """
        if not uuid_string:
            raise ValidationError(f"{field_name} is required", field=field_name)
        
        if not isinstance(uuid_string, str):
            # Try to convert to string if it's a UUID object
            if hasattr(uuid_string, '__str__'):
                uuid_string = str(uuid_string)
            else:
                raise ValidationError(f"{field_name} must be a string", field=field_name, value=type(uuid_string).__name__)
        
        try:
            return uuid.UUID(uuid_string)
        except ValueError:
            raise ValidationError(f"Invalid {field_name} format", field=field_name, value=uuid_string)
    
    @staticmethod
    def validate_filename(filename: str) -> str:
        """
        Validate uploaded filename.
        
        Args:
            filename: Original filename
            
        Returns:
            Cleaned filename
            
        Raises:
            ValidationError: If filename is invalid
        """
        if not filename:
            raise ValidationError("Filename is required", field="filename")
        
        if not isinstance(filename, str):
            raise ValidationError("Filename must be a string", field="filename", value=type(filename).__name__)
        
        filename = filename.strip()
        
        if len(filename) > InputValidator.MAX_FILENAME_LENGTH:
            from research.exceptions import FileValidationError
            raise FileValidationError(
                f"Filename must not exceed {InputValidator.MAX_FILENAME_LENGTH} characters",
                filename=filename,
                validation_type='filename_length'
            )
        
        # Check for dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\0']
        if any(char in filename for char in dangerous_chars):
            raise ValidationError(
                "Filename contains invalid characters",
                field="filename",
                value=filename
            )
        
        # Check file extension
        if '.' in filename:
            extension = '.' + filename.split('.')[-1].lower()
            if extension not in InputValidator.ALLOWED_FILE_EXTENSIONS:
                from research.exceptions import UnsupportedFileTypeError
                raise UnsupportedFileTypeError(
                    f"Unsupported file type. Allowed: {', '.join(InputValidator.ALLOWED_FILE_EXTENSIONS)}",
                    supported_types=list(InputValidator.ALLOWED_FILE_EXTENSIONS),
                    filename=filename
                )
        else:
            raise ValidationError("Filename must have an extension", field="filename", value=filename)
        
        return filename
    
    @staticmethod
    def validate_file_size(file_size: int) -> int:
        """
        Validate file size.
        
        Args:
            file_size: File size in bytes
            
        Returns:
            Validated file size
            
        Raises:
            ValidationError: If file size is invalid
        """
        if not isinstance(file_size, int):
            raise ValidationError("File size must be an integer", field="file_size", value=type(file_size).__name__)
        
        if file_size <= 0:
            raise ValidationError("File size must be positive", field="file_size", value=file_size)
        
        if file_size > InputValidator.MAX_FILE_SIZE:
            raise ValidationError(
                f"File size exceeds maximum allowed size of {InputValidator.MAX_FILE_SIZE} bytes",
                field="file_size",
                value=file_size
            )
        
        return file_size
    
    @staticmethod
    def validate_research_status(status: str) -> str:
        """
        Validate research session status.
        
        Args:
            status: Status string
            
        Returns:
            Validated status
            
        Raises:
            ValidationError: If status is invalid
        """
        if not status:
            raise ValidationError("Status is required", field="status")
        
        if not isinstance(status, str):
            raise ValidationError("Status must be a string", field="status", value=type(status).__name__)
        
        status = status.upper().strip()
        
        if status not in InputValidator.VALID_STATUSES:
            raise ValidationError(
                f"Invalid status. Must be one of: {', '.join(InputValidator.VALID_STATUSES)}",
                field="status",
                value=status
            )
        
        return status
    
    @staticmethod
    def validate_pagination_params(page: Any = None, page_size: Any = None) -> Dict[str, int]:
        """
        Validate pagination parameters.
        
        Args:
            page: Page number
            page_size: Number of items per page
            
        Returns:
            Dictionary with validated pagination parameters
            
        Raises:
            ValidationError: If pagination parameters are invalid
        """
        result = {}
        
        if page is not None:
            if not isinstance(page, (int, str)):
                raise ValidationError("Page must be a number", field="page", value=type(page).__name__)
            
            try:
                page = int(page)
            except ValueError:
                raise ValidationError("Page must be a valid integer", field="page", value=page)
            
            if page < 1:
                raise ValidationError("Page must be 1 or greater", field="page", value=page)
            
            result['page'] = page
        
        if page_size is not None:
            if not isinstance(page_size, (int, str)):
                raise ValidationError("Page size must be a number", field="page_size", value=type(page_size).__name__)
            
            try:
                page_size = int(page_size)
            except ValueError:
                raise ValidationError("Page size must be a valid integer", field="page_size", value=page_size)
            
            if page_size < 1:
                raise ValidationError("Page size must be 1 or greater", field="page_size", value=page_size)
            
            if page_size > 100:
                raise ValidationError("Page size must not exceed 100", field="page_size", value=page_size)
            
            result['page_size'] = page_size
        
        return result
    
    @staticmethod
    def validate_json_data(data: Any, required_fields: List[str] = None) -> Dict[str, Any]:
        """
        Validate JSON data structure.
        
        Args:
            data: JSON data to validate
            required_fields: List of required field names
            
        Returns:
            Validated data dictionary
            
        Raises:
            ValidationError: If data is invalid
        """
        if not isinstance(data, dict):
            raise ValidationError("Data must be a JSON object", field="data", value=type(data).__name__)
        
        if required_fields:
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if missing_fields:
                raise ValidationError(
                    f"Missing required fields: {', '.join(missing_fields)}",
                    field="data"
                )
        
        return data
    
    @staticmethod
    def _contains_suspicious_content(text: str) -> bool:
        """
        Check if text contains potentially suspicious content.
        
        Args:
            text: Text to check
            
        Returns:
            True if suspicious content is detected
        """
        # Patterns that might indicate injection attempts or malicious content
        suspicious_patterns = [
            r'<script[^>]*>',  # Script tags
            r'javascript:',     # JavaScript URLs
            r'data:text/html',  # Data URLs with HTML
            r'vbscript:',      # VBScript URLs
            r'on\w+\s*=',      # Event handlers (onclick, onload, etc.)
            r'eval\s*\(',      # eval() calls
            r'exec\s*\(',      # exec() calls
            r'system\s*\(',    # system() calls
            r'__import__',     # Python imports
            r'subprocess',     # Subprocess calls
            r'rm\s+-rf',       # Dangerous shell commands
            r';\s*rm\s+',      # Command chaining with rm
            r'\|\s*rm\s+',     # Piped rm commands
            r'&&\s*rm\s+',     # Chained rm commands
        ]
        
        text_lower = text.lower()
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False
    
    @staticmethod
    def sanitize_text_input(text: str, max_length: int = None) -> str:
        """
        Sanitize text input by removing potentially dangerous content.
        
        Args:
            text: Text to sanitize
            max_length: Maximum allowed length
            
        Returns:
            Sanitized text
            
        Raises:
            ValidationError: If text is invalid after sanitization
        """
        if not isinstance(text, str):
            raise ValidationError("Input must be a string", value=type(text).__name__)
        
        # Basic sanitization
        text = text.strip()
        
        # Remove null bytes
        text = text.replace('\0', '')
        
        # Limit length if specified
        if max_length and len(text) > max_length:
            raise ValidationError(f"Text exceeds maximum length of {max_length} characters", value=len(text))
        
        return text


# Convenience functions for common validations
def validate_research_query(query: str) -> str:
    """Validate research query - convenience function."""
    return InputValidator.validate_research_query(query)


def validate_user_id(user_id: str) -> str:
    """Validate user ID - convenience function."""
    return InputValidator.validate_user_id(user_id)


def validate_uuid(uuid_string: str, field_name: str = "id") -> uuid.UUID:
    """Validate UUID - convenience function."""
    return InputValidator.validate_uuid(uuid_string, field_name)


def validate_filename(filename: str) -> str:
    """Validate filename - convenience function."""
    return InputValidator.validate_filename(filename)


def validate_file_size(file_size: int) -> int:
    """Validate file size - convenience function."""
    return InputValidator.validate_file_size(file_size)