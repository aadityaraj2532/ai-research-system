"""
Django REST Framework serializers for file management.
"""
from rest_framework import serializers
from research.models import ResearchFile
from research.exceptions import ValidationError
from research.validators import validate_filename, validate_file_size
import logging

logger = logging.getLogger(__name__)


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload requests with comprehensive validation."""
    
    file = serializers.FileField(
        help_text="File to upload (PDF, TXT, or DOCX)",
        required=True
    )
    
    def validate_file(self, value):
        """Validate uploaded file with comprehensive checks."""
        # Basic validation
        if not value:
            raise serializers.ValidationError("No file provided")
        
        if not value.name:
            raise serializers.ValidationError("File must have a name")
        
        # Validate filename - let custom exceptions propagate for proper status codes
        try:
            validated_filename = validate_filename(value.name)
        except Exception as e:
            from research.exceptions import ResearchSystemException
            if isinstance(e, ResearchSystemException):
                # Let custom exceptions propagate to get proper status codes
                raise
            raise serializers.ValidationError("Error validating filename")
        
        # Validate file size - let FileSizeError propagate for proper status code
        if value.size > 10 * 1024 * 1024:  # 10MB limit
            from research.exceptions import FileSizeError
            # Don't catch this - let it propagate to get proper status code
            raise FileSizeError(
                f"File size ({value.size} bytes) exceeds maximum allowed size",
                file_size=value.size,
                max_size=10 * 1024 * 1024,
                filename=value.name
            )
        
        # Additional MIME type validation will be done in the service layer
        return value


class ResearchFileDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed research file information."""
    
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
    
    def to_representation(self, instance):
        """Customize representation with error handling."""
        try:
            data = super().to_representation(instance)
            
            # Add processing status information
            if instance.processing_error:
                data['processing_status'] = 'failed'
                data['processing_message'] = instance.processing_error
            elif instance.is_processed:
                data['processing_status'] = 'completed'
                data['processing_message'] = 'File processed successfully'
            else:
                data['processing_status'] = 'pending'
                data['processing_message'] = 'File processing in progress'
            
            return data
            
        except Exception as e:
            logger.error(f"Error serializing file {instance.id}: {e}")
            # Return minimal data if serialization fails
            return {
                'id': str(instance.id),
                'filename': instance.filename,
                'error': 'Error loading file details'
            }


class ResearchFileListSerializer(serializers.ModelSerializer):
    """Serializer for research file list view."""
    
    file_size_mb = serializers.ReadOnlyField()
    processing_status = serializers.SerializerMethodField()
    
    class Meta:
        model = ResearchFile
        fields = [
            'id', 'filename', 'file_type', 'file_size', 'file_size_mb',
            'is_processed', 'processing_status', 'uploaded_at'
        ]
        read_only_fields = ['id', 'file_size_mb', 'uploaded_at']
    
    def get_processing_status(self, obj):
        """Get processing status for list view."""
        try:
            if obj.processing_error:
                return 'failed'
            elif obj.is_processed:
                return 'completed'
            else:
                return 'pending'
        except Exception as e:
            logger.error(f"Error getting processing status for file {obj.id}: {e}")
            return 'unknown'