from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Application, ApplicationEvent, Interview
from .serializers import (
    ApplicationSerializer,
    InterviewSerializer,
    RegisterSerializer,
)

User = get_user_model()


def log_event(application, event_type, description):
    ApplicationEvent.objects.create(
        application=application,
        event_type=event_type,
        date=timezone.localdate(),
        description=description,
    )


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.create_user(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("username"),
            password=request.data.get("password"),
        )
        if user is None:
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key})


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        return (
            Application.objects.filter(user=self.request.user)
            .prefetch_related("events", "interviews")
            .order_by("-date_saved", "-id")
        )

    def perform_create(self, serializer):
        app = serializer.save(user=self.request.user)
        log_event(app, app.status, "Saved to tracker")

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        app = serializer.save()
        if app.status != old_status:
            if app.status == Application.Status.APPLIED and not app.date_applied:
                app.date_applied = timezone.localdate()
                app.save(update_fields=["date_applied"])
            log_event(app, app.status, f"Moved to {app.get_status_display()}")


class InterviewViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = InterviewSerializer

    def get_queryset(self):
        return Interview.objects.filter(application__user=self.request.user)

    def perform_create(self, serializer):
        interview = serializer.save()
        log_event(
            interview.application,
            "interview",
            f"Interview scheduled: {interview.interview_type}",
        )


@api_view(["GET"])
def stats(request):
    apps = Application.objects.filter(user=request.user)
    total = apps.count()
    by_status = {
        row["status"]: row["n"]
        for row in apps.values("status").annotate(n=Count("id"))
    }

    # Interview rate = of everything you've applied to, how much reached an interview.
    applied = apps.exclude(status=Application.Status.SAVED)
    applied_count = applied.count()
    reached = (
        applied.filter(
            Q(status__in=[Application.Status.INTERVIEW, Application.Status.OFFER])
            | Q(interviews__isnull=False)
        )
        .distinct()
        .count()
    )
    interview_rate = round(100 * reached / applied_count) if applied_count else 0

    upcoming = Interview.objects.filter(
        application__user=request.user, date__gte=timezone.now()
    ).count()

    return Response(
        {
            "total": total,
            "by_status": by_status,
            "interview_rate": interview_rate,
            "upcoming_interviews": upcoming,
        }
    )