"""
Health check views for production monitoring.
"""

from django.http import JsonResponse
from django.db import connection
from django.conf import settings
import redis
import os


def health_check(request):
    """
    Basic health check endpoint.
    Returns 200 if the service is healthy, 503 if not.
    """
    health_status = {
        'status': 'healthy',
        'checks': {}
    }
    
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['checks']['database'] = f'unhealthy: {str(e)}'
    
    # Check Redis connection (if configured) - optional, don't fail if not available
    try:
        if hasattr(settings, 'CELERY_BROKER_URL') and settings.CELERY_BROKER_URL and 'redis' in settings.CELERY_BROKER_URL:
            redis_client = redis.from_url(settings.CELERY_BROKER_URL)
            redis_client.ping()
            health_status['checks']['redis'] = 'healthy'
        else:
            health_status['checks']['redis'] = 'not_configured'
    except Exception as e:
        # Redis is optional - log warning but don't fail health check
        health_status['checks']['redis'] = f'warning: {str(e)}'
    
    # Check file system permissions
    try:
        media_root = getattr(settings, 'MEDIA_ROOT', '/tmp')
        test_file = os.path.join(media_root, '.health_check')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        health_status['checks']['filesystem'] = 'healthy'
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['checks']['filesystem'] = f'unhealthy: {str(e)}'
    
    # Return appropriate status code
    status_code = 200 if health_status['status'] == 'healthy' else 503
    
    return JsonResponse(health_status, status=status_code)


def readiness_check(request):
    """
    Readiness check endpoint.
    Returns 200 if the service is ready to serve traffic.
    """
    return JsonResponse({
        'status': 'ready',
        'message': 'Service is ready to serve traffic'
    })


def liveness_check(request):
    """
    Liveness check endpoint.
    Returns 200 if the service is alive.
    """
    return JsonResponse({
        'status': 'alive',
        'message': 'Service is alive'
    })