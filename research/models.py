"""
Django models for the AI Research System.
"""
import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class ResearchSession(models.Model):
    """
    Model representing a research session with all associated metadata.
    
    This model stores the complete lifecycle of a research session from
    initiation to completion, including results, costs, and relationships.
    """
    
    # Status choices for research sessions
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    # Primary identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, db_index=True, help_text="User identifier for the research session")
    
    # Research content
    query = models.TextField(help_text="Original research query submitted by user")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    
    # Research results
    report = models.JSONField(null=True, blank=True, help_text="Final structured research report")
    summary = models.TextField(blank=True, help_text="Brief summary of research findings")
    reasoning = models.JSONField(null=True, blank=True, help_text="High-level reasoning and methodology used")
    
    # Research continuation support
    parent_session = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='child_sessions',
        help_text="Parent research session if this is a continuation"
    )
    
    # Observability and tracing
    langsmith_trace_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True,
        db_index=True,
        help_text="LangSmith trace ID for debugging and observability"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'research_sessions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['parent_session', '-created_at']),
        ]
    
    def __str__(self):
        return f"Research Session {self.id} - {self.status}"
    
    @property
    def duration(self):
        """Calculate the duration of the research session."""
        if self.completed_at and self.created_at:
            return self.completed_at - self.created_at
        return None
    
    @property
    def is_continuation(self):
        """Check if this session is a continuation of another."""
        return self.parent_session is not None
    
    def get_research_lineage(self):
        """Get the complete lineage of research sessions."""
        lineage = []
        current = self
        while current:
            lineage.append(current)
            current = current.parent_session
        return list(reversed(lineage))
    
    def mark_completed(self):
        """Mark the research session as completed."""
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at', 'updated_at'])
    
    def mark_failed(self, error_message=None):
        """Mark the research session as failed."""
        self.status = 'FAILED'
        self.completed_at = timezone.now()
        if error_message and not self.reasoning:
            self.reasoning = {'error': error_message}
        self.save(update_fields=['status', 'completed_at', 'reasoning', 'updated_at'])


class ResearchFile(models.Model):
    """
    Model representing files uploaded for research context.
    
    This model tracks files that users upload to provide additional
    context for their research sessions.
    """
    
    # File type choices
    FILE_TYPE_CHOICES = [
        ('PDF', 'PDF Document'),
        ('TXT', 'Text File'),
        ('DOC', 'Word Document'),
        ('DOCX', 'Word Document (DOCX)'),
    ]
    
    # Primary identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        ResearchSession, 
        on_delete=models.CASCADE, 
        related_name='files',
        help_text="Research session this file belongs to"
    )
    
    # File metadata
    filename = models.CharField(max_length=255, help_text="Original filename")
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, help_text="Type of uploaded file")
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    
    # File content and processing
    content_summary = models.TextField(blank=True, help_text="AI-generated summary of file content")
    file_path = models.CharField(max_length=500, help_text="Path to stored file")
    
    # Processing status
    is_processed = models.BooleanField(default=False, help_text="Whether file content has been extracted and summarized")
    processing_error = models.TextField(blank=True, help_text="Error message if processing failed")
    
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'research_files'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['session', '-uploaded_at']),
            models.Index(fields=['file_type', '-uploaded_at']),
            models.Index(fields=['is_processed']),
        ]
    
    def __str__(self):
        return f"{self.filename} ({self.file_type}) - Session {self.session.id}"
    
    @property
    def file_size_mb(self):
        """Get file size in megabytes."""
        return round(self.file_size / (1024 * 1024), 2)
    
    def mark_processed(self, summary=None):
        """Mark the file as processed with optional summary."""
        self.is_processed = True
        self.processed_at = timezone.now()
        if summary:
            self.content_summary = summary
        self.save(update_fields=['is_processed', 'processed_at', 'content_summary'])
    
    def mark_processing_failed(self, error_message):
        """Mark file processing as failed with error message."""
        self.processing_error = error_message
        self.save(update_fields=['processing_error'])


class ResearchCost(models.Model):
    """
    Model representing cost and token usage for research sessions.
    
    This model tracks the AI usage costs and token consumption
    for each research session to enable cost monitoring and control.
    """
    
    # One-to-one relationship with research session
    session = models.OneToOneField(
        ResearchSession, 
        on_delete=models.CASCADE, 
        related_name='cost',
        help_text="Research session this cost data belongs to"
    )
    
    # Token usage tracking
    input_tokens = models.PositiveIntegerField(default=0, help_text="Number of input tokens used")
    output_tokens = models.PositiveIntegerField(default=0, help_text="Number of output tokens generated")
    total_tokens = models.PositiveIntegerField(default=0, help_text="Total tokens (input + output)")
    
    # Cost tracking
    estimated_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=4, 
        default=0.0000,
        help_text="Estimated cost in USD"
    )
    
    # Provider-specific cost breakdown
    provider_costs = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Detailed cost breakdown by provider (OpenAI, Anthropic, etc.)"
    )
    
    # Additional metadata
    currency = models.CharField(max_length=3, default='USD', help_text="Currency for cost calculations")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'research_costs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session']),
            models.Index(fields=['-estimated_cost']),
            models.Index(fields=['-total_tokens']),
        ]
    
    def __str__(self):
        return f"Cost for Session {self.session.id}: ${self.estimated_cost}"
    
    def update_totals(self):
        """Update total tokens and save."""
        self.total_tokens = self.input_tokens + self.output_tokens
        self.save(update_fields=['total_tokens', 'updated_at'])
    
    @property
    def cost_per_token(self):
        """Calculate cost per token if tokens > 0."""
        if self.total_tokens > 0:
            return float(self.estimated_cost) / self.total_tokens
        return 0.0
    
    @classmethod
    def get_user_total_cost(cls, user_id, start_date=None, end_date=None):
        """Get total cost for a user within optional date range."""
        queryset = cls.objects.filter(session__user_id=user_id)
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        result = queryset.aggregate(
            total_cost=models.Sum('estimated_cost'),
            total_tokens=models.Sum('total_tokens'),
            session_count=models.Count('session')
        )
        
        return {
            'total_cost': result['total_cost'] or 0,
            'total_tokens': result['total_tokens'] or 0,
            'session_count': result['session_count'] or 0
        }