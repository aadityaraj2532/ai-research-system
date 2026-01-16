"""
CSRF token view for frontend authentication.
"""
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse


@ensure_csrf_cookie
def get_csrf_token(request):
    """
    View to get CSRF token for frontend.
    This sets the csrftoken cookie that the frontend can read.
    """
    return JsonResponse({'detail': 'CSRF cookie set'})
