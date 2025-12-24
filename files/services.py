"""
File processing services for the AI Research System.

This module provides services for uploading, processing, and extracting
content from various file types (PDF, TXT, DOCX) for research context.
"""
import os
import tempfile
import mimetypes
from typing import Dict, Any, Optional
from django.core.files.uploadedfile import UploadedFile
from django.conf import settings
from research.models import ResearchSession, ResearchFile
from research.exceptions import (
    FileProcessingError,
    FileValidationError,
    FileSizeError,
    UnsupportedFileTypeError
)
from research.validators import validate_filename, validate_file_size
import PyPDF2
import logging

logger = logging.getLogger(__name__)

# Try to import python-magic, fall back to mimetypes if not available
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False
    logger.warning("python-magic not available, using mimetypes for file type detection")


class FileProcessingService:
    """Service for processing uploaded files and extracting content."""
    
    SUPPORTED_TYPES = {
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/msword': 'doc'
    }
    
    # File extension to MIME type mapping for fallback
    EXTENSION_MAPPING = {
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword'
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def __init__(self):
        """Initialize the file processing service."""
        self.ensure_upload_directory()
    
    def ensure_upload_directory(self):
        """Ensure the upload directory exists."""
        try:
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'research_files')
            os.makedirs(upload_dir, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to create upload directory: {e}")
            raise FileProcessingError("Failed to initialize file storage")
    
    def _detect_mime_type(self, uploaded_file: UploadedFile) -> str:
        """
        Detect MIME type of uploaded file.
        
        Args:
            uploaded_file: Django UploadedFile instance
            
        Returns:
            MIME type string
            
        Raises:
            FileValidationError: If MIME type detection fails
        """
        try:
            if HAS_MAGIC:
                try:
                    # Use python-magic if available
                    uploaded_file.seek(0)
                    file_header = uploaded_file.read(1024)
                    uploaded_file.seek(0)
                    return magic.from_buffer(file_header, mime=True)
                except Exception as e:
                    logger.warning(f"Magic detection failed: {e}, falling back to extension-based detection")
            
            # Fallback to extension-based detection
            filename = uploaded_file.name.lower()
            for ext, mime_type in self.EXTENSION_MAPPING.items():
                if filename.endswith(ext):
                    return mime_type
            
            # Final fallback to mimetypes module
            mime_type, _ = mimetypes.guess_type(uploaded_file.name)
            return mime_type or 'application/octet-stream'
            
        except Exception as e:
            logger.error(f"MIME type detection failed for {uploaded_file.name}: {e}")
            raise FileValidationError(
                "Failed to detect file type",
                filename=uploaded_file.name,
                validation_type='mime_detection'
            )
    
    def validate_file(self, uploaded_file: UploadedFile) -> Dict[str, Any]:
        """
        Validate uploaded file for type and size.
        
        Args:
            uploaded_file: Django UploadedFile instance
            
        Returns:
            Dict with validation results
            
        Raises:
            FileSizeError: If file size exceeds limits
            UnsupportedFileTypeError: If file type is not supported
            FileValidationError: If other validation fails
        """
        try:
            # Validate filename
            validate_filename(uploaded_file.name)
            
            # Validate file size
            if uploaded_file.size > self.MAX_FILE_SIZE:
                raise FileSizeError(
                    f'File size ({uploaded_file.size} bytes) exceeds maximum allowed size ({self.MAX_FILE_SIZE} bytes)',
                    file_size=uploaded_file.size,
                    max_size=self.MAX_FILE_SIZE,
                    filename=uploaded_file.name
                )
            
            # Check for empty file
            if uploaded_file.size == 0:
                raise FileProcessingError("Cannot upload empty file", filename=uploaded_file.name)
            
            # Detect and validate MIME type
            mime_type = self._detect_mime_type(uploaded_file)
            
            if mime_type not in self.SUPPORTED_TYPES:
                raise UnsupportedFileTypeError(
                    f'Unsupported file type: {mime_type}',
                    mime_type=mime_type,
                    supported_types=list(self.SUPPORTED_TYPES.keys()),
                    filename=uploaded_file.name
                )
            
            return {
                'valid': True,
                'file_type': self.SUPPORTED_TYPES[mime_type],
                'mime_type': mime_type,
                'error': None
            }
            
        except (FileSizeError, UnsupportedFileTypeError, FileValidationError):
            raise
        except Exception as e:
            logger.error(f'File validation error for {uploaded_file.name}: {e}')
            raise FileValidationError(
                f'Error validating file: {str(e)}',
                filename=uploaded_file.name
            )
    
    def save_uploaded_file(self, uploaded_file: UploadedFile, session_id: str) -> str:
        """
        Save uploaded file to disk.
        
        Args:
            uploaded_file: Django UploadedFile instance
            session_id: Research session ID
            
        Returns:
            File path where the file was saved
            
        Raises:
            FileProcessingError: If file saving fails
        """
        try:
            # Create session-specific directory
            session_dir = os.path.join(settings.MEDIA_ROOT, 'research_files', str(session_id))
            os.makedirs(session_dir, exist_ok=True)
            
            # Generate safe filename with length limits to prevent path issues
            filename = uploaded_file.name
            if len(filename) > 100:  # Reasonable limit for filename
                name, ext = os.path.splitext(filename)
                filename = name[:95] + ext  # Keep extension, truncate name
            
            file_path = os.path.join(session_dir, filename)
            
            # Handle filename conflicts
            counter = 1
            base_name, ext = os.path.splitext(filename)
            while os.path.exists(file_path):
                new_filename = f"{base_name}_{counter}{ext}"
                file_path = os.path.join(session_dir, new_filename)
                counter += 1
            
            # Save file
            with open(file_path, 'wb') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)
            
            logger.info(f"File {uploaded_file.name} saved to {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Failed to save file {uploaded_file.name}: {e}")
            raise FileProcessingError(
                f"Failed to save file: {str(e)}",
                filename=uploaded_file.name
            )
    
    def extract_text_content(self, file_path: str, file_type: str) -> str:
        """
        Extract text content from file based on type.
        
        Args:
            file_path: Path to the file
            file_type: Type of file (PDF, TXT, DOCX)
            
        Returns:
            Extracted text content
            
        Raises:
            FileProcessingError: If text extraction fails
        """
        try:
            if file_type.lower() == 'pdf':
                return self._extract_pdf_text(file_path)
            elif file_type.lower() == 'txt':
                return self._extract_txt_text(file_path)
            elif file_type.lower() in ['docx', 'doc']:
                return self._extract_docx_text(file_path)
            else:
                raise FileProcessingError(
                    f'Unsupported file type for text extraction: {file_type}',
                    file_type=file_type
                )
                
        except FileProcessingError:
            raise
        except Exception as e:
            logger.error(f'Text extraction error for {file_path}: {e}')
            raise FileProcessingError(
                f'Failed to extract text from file: {str(e)}',
                filename=os.path.basename(file_path),
                file_type=file_type
            )
    
    def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file using PyPDF2."""
        try:
            text_content = []
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                if len(pdf_reader.pages) == 0:
                    raise FileProcessingError("PDF file contains no pages")
                
                for page_num in range(len(pdf_reader.pages)):
                    try:
                        page = pdf_reader.pages[page_num]
                        page_text = page.extract_text()
                        if page_text.strip():  # Only add non-empty pages
                            text_content.append(page_text)
                    except Exception as e:
                        logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                        continue
            
            if not text_content:
                raise FileProcessingError("No text could be extracted from PDF")
            
            return '\n'.join(text_content)
            
        except FileProcessingError:
            raise
        except Exception as e:
            raise FileProcessingError(f"PDF text extraction failed: {str(e)}")
    
    def _extract_txt_text(self, file_path: str) -> str:
        """Extract text from TXT file."""
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    content = file.read()
                    if content.strip():  # Ensure file is not empty
                        return content
                    else:
                        raise FileProcessingError("Text file is empty")
            except UnicodeDecodeError:
                continue
            except FileProcessingError:
                raise
            except Exception as e:
                logger.warning(f"Failed to read file with encoding {encoding}: {e}")
                continue
        
        # If all encodings fail, try binary read with error handling
        try:
            with open(file_path, 'rb') as file:
                content = file.read().decode('utf-8', errors='ignore')
                if content.strip():
                    return content
                else:
                    raise FileProcessingError("Text file is empty or unreadable")
        except Exception as e:
            raise FileProcessingError(f"Failed to read text file: {str(e)}")
    
    def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX file. For now, return placeholder."""
        # Note: This would require python-docx library
        # For now, return a placeholder indicating DOCX processing is not implemented
        filename = os.path.basename(file_path)
        return f"[DOCX file content extraction not implemented yet. File: {filename}]"
    
    def generate_content_summary(self, content: str, max_length: int = 500) -> str:
        """
        Generate a summary of file content.
        
        Args:
            content: Full text content
            max_length: Maximum length of summary
            
        Returns:
            Content summary
            
        Raises:
            FileProcessingError: If summary generation fails
        """
        try:
            if not content or not content.strip():
                return "Empty file or no extractable content."
            
            # Clean content
            content = content.strip()
            
            # Basic statistics
            word_count = len(content.split())
            char_count = len(content)
            line_count = len(content.split('\n'))
            
            # Create summary
            if len(content) <= max_length:
                summary = content
            else:
                summary = content[:max_length] + "..."
            
            # Add metadata
            metadata = f"\n\n[File Statistics: {word_count} words, {char_count} characters, {line_count} lines]"
            
            return summary + metadata
            
        except Exception as e:
            logger.error(f"Failed to generate content summary: {e}")
            raise FileProcessingError(f"Failed to generate content summary: {str(e)}")
    
    def process_uploaded_file(self, uploaded_file: UploadedFile, session: ResearchSession) -> ResearchFile:
        """
        Complete file processing workflow.
        
        Args:
            uploaded_file: Django UploadedFile instance
            session: Research session to associate file with
            
        Returns:
            Created ResearchFile instance
            
        Raises:
            FileSizeError: If file size exceeds limits
            UnsupportedFileTypeError: If file type is not supported
            FileValidationError: If file validation fails
            FileProcessingError: If file processing fails
        """
        # Validate file first - let validation exceptions propagate
        validation = self.validate_file(uploaded_file)
        
        try:
            # Save file to disk
            file_path = self.save_uploaded_file(uploaded_file, str(session.id))
            
            # Create ResearchFile record
            research_file = ResearchFile.objects.create(
                session=session,
                filename=uploaded_file.name,
                file_type=validation['file_type'],
                file_size=uploaded_file.size,
                file_path=file_path,
                is_processed=False
            )
            
            try:
                # Extract text content
                text_content = self.extract_text_content(file_path, validation['file_type'])
                
                # Generate summary
                content_summary = self.generate_content_summary(text_content)
                
                # Update file record
                research_file.content_summary = content_summary
                research_file.mark_processed(content_summary)
                
                logger.info(f"File {uploaded_file.name} processed successfully", extra={
                    'file_id': str(research_file.id),
                    'session_id': str(session.id),
                    'file_type': validation['file_type'],
                    'content_length': len(text_content)
                })
                
            except Exception as e:
                # Mark processing as failed
                error_message = f"Failed to process file: {str(e)}"
                research_file.mark_processing_failed(error_message)
                logger.error(f'File processing failed for {uploaded_file.name}: {e}')
                
                # Re-raise the exception so the caller knows processing failed
                raise FileProcessingError(
                    error_message,
                    filename=uploaded_file.name,
                    file_type=validation.get('file_type')
                )
            
            return research_file
            
        except (FileSizeError, UnsupportedFileTypeError, FileValidationError, FileProcessingError):
            raise
        except OSError as e:
            # Handle disk space and file system errors specifically
            logger.error(f"File system error processing file {uploaded_file.name}: {e}")
            raise FileProcessingError(
                f"Failed to save file: {str(e)}",
                filename=uploaded_file.name
            )
        except Exception as e:
            logger.error(f"Unexpected error processing file {uploaded_file.name}: {e}")
            raise FileProcessingError(
                f"Unexpected error during file processing: {str(e)}",
                filename=uploaded_file.name
            )


# Global service instance
file_service = FileProcessingService()