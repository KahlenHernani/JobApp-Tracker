from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import ai
from .models import Application, ApplicationEvent, Interview, Profile, Project, Resume
from .serializers import (
    ApplicationSerializer,
    InterviewSerializer,
    RegisterSerializer,
    ResumeSerializer,
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

    @action(detail=True, methods=["post"])
    def tailor(self, request, pk=None):
        app = self.get_object()  # scoped to the current user by get_queryset
        task = request.data.get("task")
        if task not in ai.TASKS:
            raise ValidationError({"detail": "Unknown task."})
        profile = Profile.objects.filter(user=request.user).first()
        resume_obj = Resume.objects.filter(user=request.user).order_by("-updated").first()
        resume = resume_obj.text if resume_obj else ""
        if not resume.strip():
            raise ValidationError({"detail": "Add your resume first."})
        if not app.job_description.strip():
            raise ValidationError({"detail": "Add the job description first."})
        try:
            result = ai.tailor(task, app, resume)
        except ai.AIError:
            return Response(
                {"detail": "The AI is busy or your free quota ran out. Try again in a minute."},
                status=502,
            )
        return Response({"result": result})


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


@api_view(["GET", "PUT"])
def profile(request):
    p, _ = Profile.objects.get_or_create(user=request.user)
    if request.method == "PUT":
        p.resume_text = str(request.data.get("resume_text", ""))[:20000]
        p.save()
    return Response({"resume_text": p.resume_text})


import traceback  # add to the imports at the top


@api_view(["POST"])
def parse_job(request):
    text = str(request.data.get("text") or "").strip()
    if len(text) < 50:
        return Response({"detail": "Not enough text to parse."}, status=400)
    try:
        return Response(ai.parse_job(text[:20000]))
    except (ai.AIError, ValueError):
        traceback.print_exc()  # shows the real cause in the runserver terminal
        return Response({"detail": "Couldn't read that posting. Try again in a minute."}, status=502)

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by("-id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user).order_by("name")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(["POST"])
def cover_letter(request):
    try:
        resume = Resume.objects.filter(user=request.user, pk=int(request.data.get("resume_id"))).first()
    except (TypeError, ValueError):
        resume = None
    if not resume or not resume.text.strip():
        raise ValidationError({"detail": "Pick a resume that has text in it."})
    jd = str(request.data.get("job_description") or "").strip()
    if len(jd) < 50:
        raise ValidationError({"detail": "Not enough job description text."})
    company = str(request.data.get("company") or "")[:200]
    position = str(request.data.get("position") or "")[:200]
    try:
        letter = ai.cover_letter(company, position, jd[:20000], resume.text)
    except ai.AIError:
        traceback.print_exc()
        return Response({"detail": "The AI is busy or your quota ran out. Try again in a minute."}, status=502)
    return Response({"letter": letter})