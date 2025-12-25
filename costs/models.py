"""
Django models for cost tracking in the AI Research System.

This module contains models specifically focused on cost analysis,
budgeting, and usage monitoring across the system.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.db.models import Sum, Avg, Count


class CostBudget(models.Model):
    """
    Model for tracking user cost budgets and limits.
    
    This model allows users to set spending limits and track
    their usage against those limits.
    """
    
    PERIOD_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('YEARLY', 'Yearly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, db_index=True)
    
    # Budget configuration
    budget_limit = models.DecimalField(max_digits=10, decimal_places=4, help_text="Budget limit in USD")
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='MONTHLY')
    
    # Budget tracking
    current_usage = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    is_active = models.BooleanField(default=True)
    
    # Alert thresholds
    warning_threshold = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=80.00,
        help_text="Percentage of budget at which to send warning (0-100)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    period_start = models.DateTimeField(help_text="Start of current budget period")
    period_end = models.DateTimeField(help_text="End of current budget period")
    
    class Meta:
        db_table = 'cost_budgets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', 'is_active']),
            models.Index(fields=['period_end']),
        ]
        unique_together = ['user_id', 'period', 'is_active']
    
    def __str__(self):
        return f"Budget for {self.user_id}: ${self.budget_limit} ({self.period})"
    
    @property
    def usage_percentage(self):
        """Calculate the percentage of budget used."""
        if self.budget_limit > 0:
            return float(self.current_usage) / float(self.budget_limit) * 100
        return 0.0
    
    @property
    def remaining_budget(self):
        """Calculate remaining budget."""
        return self.budget_limit - Decimal(str(self.current_usage))
    
    @property
    def is_over_budget(self):
        """Check if current usage exceeds budget."""
        return Decimal(str(self.current_usage)) > self.budget_limit
    
    @property
    def is_warning_threshold_reached(self):
        """Check if usage has reached warning threshold."""
        return self.usage_percentage >= float(self.warning_threshold)
    
    def add_usage(self, amount):
        """Add usage to current period."""
        self.current_usage = Decimal(str(self.current_usage)) + Decimal(str(amount))
        self.save(update_fields=['current_usage', 'updated_at'])
    
    def reset_period(self, new_start, new_end):
        """Reset budget for new period."""
        self.current_usage = Decimal('0.0000')
        self.period_start = new_start
        self.period_end = new_end
        self.save(update_fields=['current_usage', 'period_start', 'period_end', 'updated_at'])


class CostAlert(models.Model):
    """
    Model for tracking cost-related alerts and notifications.
    
    This model stores alerts that are triggered when users
    approach or exceed their budget limits.
    """
    
    ALERT_TYPE_CHOICES = [
        ('WARNING', 'Budget Warning'),
        ('LIMIT_EXCEEDED', 'Budget Limit Exceeded'),
        ('UNUSUAL_USAGE', 'Unusual Usage Pattern'),
        ('DAILY_SUMMARY', 'Daily Usage Summary'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
        ('DISMISSED', 'Dismissed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, db_index=True)
    budget = models.ForeignKey(CostBudget, on_delete=models.CASCADE, null=True, blank=True)
    
    # Alert details
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Alert content
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True, help_text="Additional alert data")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'cost_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['alert_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"Alert for {self.user_id}: {self.title}"
    
    def mark_sent(self):
        """Mark alert as sent."""
        self.status = 'SENT'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])
    
    def mark_failed(self):
        """Mark alert as failed to send."""
        self.status = 'FAILED'
        self.save(update_fields=['status'])
    
    def dismiss(self):
        """Dismiss the alert."""
        self.status = 'DISMISSED'
        self.save(update_fields=['status'])


class CostAnalytics(models.Model):
    """
    Model for storing aggregated cost analytics data.
    
    This model stores pre-computed analytics to enable fast
    reporting and dashboard queries.
    """
    
    AGGREGATION_CHOICES = [
        ('HOURLY', 'Hourly'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, db_index=True)
    
    # Aggregation metadata
    aggregation_level = models.CharField(max_length=10, choices=AGGREGATION_CHOICES)
    period_start = models.DateTimeField(db_index=True)
    period_end = models.DateTimeField()
    
    # Aggregated metrics
    total_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    total_tokens = models.PositiveBigIntegerField(default=0)
    total_sessions = models.PositiveIntegerField(default=0)
    
    # Average metrics
    avg_cost_per_session = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    avg_tokens_per_session = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Provider breakdown
    provider_breakdown = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cost_analytics'
        ordering = ['-period_start']
        indexes = [
            models.Index(fields=['user_id', 'aggregation_level', '-period_start']),
            models.Index(fields=['period_start', 'period_end']),
        ]
        unique_together = ['user_id', 'aggregation_level', 'period_start']
    
    def __str__(self):
        return f"Analytics for {self.user_id}: {self.aggregation_level} - ${self.total_cost}"
    
    @classmethod
    def generate_analytics(cls, user_id, aggregation_level, period_start, period_end):
        """Generate analytics for a specific period."""
        from research.models import ResearchCost
        
        # Get all costs in the period
        costs = ResearchCost.objects.filter(
            session__user_id=user_id,
            created_at__gte=period_start,
            created_at__lt=period_end
        )
        
        # Calculate aggregated metrics
        aggregated = costs.aggregate(
            total_cost=Sum('estimated_cost'),
            total_tokens=Sum('total_tokens'),
            total_sessions=Count('session'),
            avg_cost=Avg('estimated_cost'),
            avg_tokens=Avg('total_tokens')
        )
        
        # Create or update analytics record
        analytics, created = cls.objects.update_or_create(
            user_id=user_id,
            aggregation_level=aggregation_level,
            period_start=period_start,
            defaults={
                'period_end': period_end,
                'total_cost': aggregated['total_cost'] or Decimal('0.0000'),
                'total_tokens': aggregated['total_tokens'] or 0,
                'total_sessions': aggregated['total_sessions'] or 0,
                'avg_cost_per_session': aggregated['avg_cost'] or Decimal('0.0000'),
                'avg_tokens_per_session': aggregated['avg_tokens'] or Decimal('0.00'),
            }
        )
        
        return analytics