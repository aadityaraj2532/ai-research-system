from django.urls import path
from . import views

urlpatterns = [
    # File upload and management endpoints
    path('research/<uuid:session_id>/files/', views.manage_session_files, name='manage-session-files'),
    path('research/<uuid:session_id>/files/<uuid:file_id>/', views.manage_file, name='manage-file'),
]