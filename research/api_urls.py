"""
URL patterns that match the exact API specifications.
"""
from django.urls import path
from . import api_views
from .csrf_views import get_csrf_token

urlpatterns = [
    # CSRF token endpoint
    path('csrf/', get_csrf_token, name='csrf-token'),
    
    # Exact API endpoints as specified
    path('research/start', api_views.start_research, name='start-research'),
    path('research/<uuid:research_id>/upload', api_views.upload_context_file, name='upload-context-file'),
    path('research/<uuid:research_id>/continue', api_views.continue_research, name='continue-research'),
    path('research/history', api_views.research_history, name='research-history'),
    path('research/<uuid:research_id>', api_views.research_details, name='research-details'),
]