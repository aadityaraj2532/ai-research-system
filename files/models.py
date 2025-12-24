"""
Django models for file management in the AI Research System.

This module contains models that are specifically focused on file
handling and processing, separate from the main research models.
"""
import uuid
from django.db import models
from django.utils import timezone


class FileProcessingJob(models.Model):
    """
    Model for tracking background file processing jobs.
    
    This model tracks the status of file processing operations
    that happen asynchronously in the background.
    """
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_id = models.UUIDField(help_text="ID of the ResearchFile being processed")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Processing details
    task_id = models.CharField(max_length=255, null=True, blank=True, help_text="Celery task ID")
    error_message = models.TextField(blank=True, help_text="Error message if processing failed")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'file_processing_jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['file_id']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['task_id']),
        ]
    
    def __str__(self):
        return f"Processing Job {self.id} - {self.status}"
    
    def mark_started(self):
        """Mark the job as started."""
        self.status = 'PROCESSING'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_completed(self):
        """Mark the job as completed."""
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])
    
    def mark_failed(self, error_message):
        """Mark the job as failed with error message."""
        self.status = 'FAILED'
        self.completed_at = timezone.now()
        self.error_message = error_message
        self.save(update_fields=['status', 'completed_at', 'error_message'])


class FileUploadSession(models.Model):
    """
    Model for tracking file upload sessions.
    
    This model groups multiple file uploads that happen together
    and tracks the overall upload session status.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    research_session_id = models.UUIDField(help_text="ID of the associated research session")
    user_id = models.CharField(max_length=255, db_index=True)
    
    # Upload session metadata
    total_files = models.PositiveIntegerField(default=0)
    processed_files = models.PositiveIntegerField(default=0)
    failed_files = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'file_upload_sessions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['research_session_id']),
            models.Index(fields=['user_id', '-created_at']),
        ]
    
    def __str__(self):
        return f"Upload Session {self.id} - {self.processed_files}/{self.total_files} processed"
    
    @property
    def is_complete(self):
        """Check if all files in the session have been processed."""
        return (self.processed_files + self.failed_files) >= self.total_files
    
    @property
    def success_rate(self):
        """Calculate the success rate of file processing."""
        if self.total_files == 0:
            return 0.0
        return (self.processed_files / self.total_files) * 100
    
    def increment_processed(self):
        """Increment the processed files counter."""
        self.processed_files += 1
        if self.is_complete and not self.completed_at:
            self.completed_at = timezone.now()
        self.save(update_fields=['processed_files', 'completed_at'])
    
    def increment_failed(self):
        """Increment the failed files counter."""
        self.failed_files += 1
        if self.is_complete and not self.completed_at:
            self.completed_at = timezone.now()
        self.save(update_fields=['failed_files', 'completed_at'])