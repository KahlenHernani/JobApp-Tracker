from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("applications", views.ApplicationViewSet, basename="application")
router.register("interviews", views.InterviewViewSet, basename="interview")
router.register("projects", views.ProjectViewSet, basename="project")
router.register("resumes", views.ResumeViewSet, basename="resume")
# in urlpatterns:
path("cover-letter/", views.cover_letter),

urlpatterns = [
    path("auth/login/", views.LoginView.as_view()),
    path("auth/register/", views.RegisterView.as_view()),
    path("stats/", views.stats),
    path("", include(router.urls)),
    path("profile/", views.profile),
    path("parse-job/", views.parse_job),
]