from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResearchSessionViewSet

router = DefaultRouter()
router.register(r'research', ResearchSessionViewSet, basename='research')

urlpatterns = [
    path('', include(router.urls)),
]