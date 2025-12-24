"""
Django settings for ai_research_system project.

This file imports the appropriate settings based on the DJANGO_SETTINGS_MODULE environment variable.
For development, use: ai_research_system.settings.development
For production, use: ai_research_system.settings.production
"""

import os
from decouple import config

# Determine which settings to use
ENVIRONMENT = config('DJANGO_ENVIRONMENT', default='development')

if ENVIRONMENT == 'production':
    from .settings.production import *
elif ENVIRONMENT == 'development':
    from .settings.development import *
else:
    # Default to development settings
    from .settings.development import *
