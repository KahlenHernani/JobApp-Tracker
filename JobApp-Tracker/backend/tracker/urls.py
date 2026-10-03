from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("applications", views.ApplicationViewSet, basename="application")
router.register("interviews", views.InterviewViewSet, basename="interview")
router.register("projects", views.ProjectViewSet, basename="project")
router.register("resumes", views.ResumeViewSet, basename="resume")

urlpatterns = [
    path("gmail/connect/", views.gmail_connect),
    path("gmail/callback/", views.gmail_callback),
    path("gmail/status/", views.gmail_status),
    path("gmail/sync/", views.gmail_sync),
    path("gmail/suggestions/", views.gmail_suggestions),
    path("gmail/suggestions/<int:pk>/", views.gmail_resolve),
    path("gmail/disconnect/", views.gmail_disconnect),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/register/", views.RegisterView.as_view()),
    path("stats/", views.stats),
    path("cover-letter/", views.cover_letter),
    path("resumes/upload/", views.resume_upload),  # must come before the router include
    path("", include(router.urls)),
    path("profile/", views.profile),
    path("parse-job/", views.parse_job),
]