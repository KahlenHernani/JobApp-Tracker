from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from pathlib import Path

from pypdf import PdfReader
from rest_framework.decorators import action, api_view, parser_classes
from rest_framework.parsers import MultiPartParser

from . import ai
from .models import Application, ApplicationEvent, Interview, Profile, Project, Resume
from .serializers import (
    ApplicationSerializer,
    InterviewSerializer,
    ProjectSerializer,
    RegisterSerializer,
    ResumeSerializer,
)


import os
from datetime import timedelta

from django.core import signing
from django.shortcuts import get_object_or_404, redirect
from rest_framework.decorators import action, api_view, authentication_classes, parser_classes, permission_classes

from . import ai, gmail
from .models import (
    Application, ApplicationEvent, EmailSuggestion, GmailLink, Interview, Profile, Project, Resume,
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

@api_view(["POST"])
@parser_classes([MultiPartParser])
def resume_upload(request):
    f = request.FILES.get("file")
    if not f:
        raise ValidationError({"detail": "Choose a PDF file."})
    if f.size > 5 * 1024 * 1024:
        raise ValidationError({"detail": "That PDF is over 5 MB."})
    try:
        reader = PdfReader(f)
        text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
    except Exception:
        raise ValidationError({"detail": "Couldn't read that PDF. Is it password-protected?"})
    if not text:
        raise ValidationError({"detail": "No text found in that PDF. Scanned or image-only PDFs can't be read."})
    name = str(request.data.get("name") or "").strip()[:100] or Path(f.name).stem[:100]
    resume = Resume.objects.create(user=request.user, name=name, text=text[:20000])
    return Response(ResumeSerializer(resume).data, status=201)


@api_view(["GET"])
def gmail_connect(request):
    try:
        return Response({"url": gmail.auth_url(request.user)})
    except gmail.GmailError as e:
        return Response({"detail": str(e)}, status=500)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def gmail_callback(request):
    front = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    try:
        if request.GET.get("error"):
            raise gmail.GmailError("Access denied.")
        user = User.objects.get(pk=gmail.user_id_from_state(request.GET.get("state", "")))
        refresh = gmail.exchange_code(request.GET.get("code", ""))
    except (gmail.GmailError, signing.BadSignature, User.DoesNotExist):
        return redirect(f"{front}/?gmail=error")
    GmailLink.objects.update_or_create(user=user, defaults={"refresh_token": refresh, "last_sync": None})
    return redirect(f"{front}/?gmail=connected")


@api_view(["GET"])
def gmail_status(request):
    link = GmailLink.objects.filter(user=request.user).first()
    return Response({"connected": bool(link), "last_sync": link.last_sync if link else None})


@api_view(["POST"])
def gmail_sync(request):
    link = GmailLink.objects.filter(user=request.user).first()
    if not link:
        raise ValidationError({"detail": "Connect Gmail first."})
    started = timezone.now()
    since = link.last_sync or started - timedelta(days=14)
    try:
        token = gmail.access_token(link.refresh_token)
        messages = gmail.recent_messages(token, since)
    except gmail.GmailError as e:
        return Response({"detail": str(e)}, status=502)

    apps = list(Application.objects.filter(user=request.user).exclude(status=Application.Status.REJECTED))
    known = set(EmailSuggestion.objects.filter(user=request.user).values_list("message_id", flat=True))
    created = 0
    failed = False
    for m in messages:
        if m["id"] in known:
            continue
        app = gmail.match_application(apps, m)
        if not app:
            continue
        try:
            suggested = ai.classify_email(app.company, m["subject"], m["body"] or m["snippet"])
        except ai.AIError:
            traceback.print_exc()
            failed = True
            continue
        if suggested == "none" or suggested == app.status:
            continue
        EmailSuggestion.objects.create(
            user=request.user, application=app, message_id=m["id"],
            subject=m["subject"][:300], snippet=m["snippet"][:400], suggested_status=suggested,
        )
        created += 1
    if not failed:  # if the AI hiccuped, re-scan the same window next time
        link.last_sync = started
        link.save(update_fields=["last_sync"])
    return Response({"created": created, "checked": len(messages)})


@api_view(["GET"])
def gmail_suggestions(request):
    qs = (
        EmailSuggestion.objects.filter(user=request.user, state=EmailSuggestion.State.PENDING)
        .select_related("application")
        .order_by("-created")
    )
    return Response([
        {
            "id": s.id,
            "application": s.application_id,
            "company": s.application.company,
            "position": s.application.position,
            "current_status": s.application.status,
            "suggested_status": s.suggested_status,
            "subject": s.subject,
            "snippet": s.snippet,
        }
        for s in qs
    ])


@api_view(["POST"])
def gmail_resolve(request, pk):
    s = get_object_or_404(EmailSuggestion, pk=pk, user=request.user, state=EmailSuggestion.State.PENDING)
    action_name = request.data.get("action")
    if action_name == "accept":
        app = s.application
        if app.status != s.suggested_status:
            app.status = s.suggested_status
            app.save(update_fields=["status"])
            log_event(app, app.status, f"Moved to {app.get_status_display()} (email: {s.subject[:80]})")
        s.state = EmailSuggestion.State.ACCEPTED
    elif action_name == "dismiss":
        s.state = EmailSuggestion.State.DISMISSED
    else:
        raise ValidationError({"detail": "Unknown action."})
    s.save(update_fields=["state"])
    return Response({"ok": True})


@api_view(["POST"])
def gmail_disconnect(request):
    link = GmailLink.objects.filter(user=request.user).first()
    if link:
        gmail.revoke(link.refresh_token)
        link.delete()
    return Response({"ok": True})


@api_view(["POST"])
def recommend_resume(request):
    text = str(request.data.get("text") or "").strip()
    if len(text) < 50:
        raise ValidationError({"detail": "Not enough page text."})
    resumes = list(
        Resume.objects.filter(user=request.user).exclude(text="").order_by("-updated")[:3]
    )
    if not resumes:
        raise ValidationError({"detail": "Add a resume in the tracker first."})
    try:
        rankings = ai.rank_resumes(text[:15000], resumes)
    except (ai.AIError, ValueError):
        traceback.print_exc()
        return Response({"detail": "Couldn't score your resumes. Try again in a minute."}, status=502)
    names = {r.id: r.name for r in resumes}
    for r in rankings:
        r["name"] = names[r["id"]]
    return Response({"rankings": rankings, "considered": len(resumes)})