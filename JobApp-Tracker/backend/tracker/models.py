from django.conf import settings
from django.db import models


class Application(models.Model):
    class Status(models.TextChoices):
        SAVED = "saved"
        APPLIED = "applied"
        INTERVIEW = "interview"
        OFFER = "offer"
        REJECTED = "rejected"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    company = models.CharField(max_length=200)
    position = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    job_type = models.CharField(max_length=50, blank=True)
    salary = models.CharField(max_length=100, blank=True)
    application_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SAVED)
    date_saved = models.DateField(auto_now_add=True)
    date_applied = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    job_description = models.TextField(blank=True)


class Interview(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="interviews")
    interview_type = models.CharField(max_length=100)
    date = models.DateTimeField()
    interviewer = models.CharField(max_length=200, blank=True)
    meeting_link = models.URLField(blank=True)
    notes = models.TextField(blank=True)


class ApplicationEvent(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=50)
    date = models.DateField()
    description = models.CharField(max_length=300, blank=True)


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    resume_text = models.TextField(blank=True)


class Project(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=200)
    tech = models.JSONField(default=list, blank=True)
    bullets = models.JSONField(default=list, blank=True)
    link = models.URLField(blank=True)
    created = models.DateTimeField(auto_now_add=True)


class Resume(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resumes")
    name = models.CharField(max_length=100)
    text = models.TextField(blank=True)
    updated = models.DateTimeField(auto_now=True)

class GmailLink(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gmail")
    refresh_token = models.TextField()
    last_sync = models.DateTimeField(null=True, blank=True)


class EmailSuggestion(models.Model):
    class State(models.TextChoices):
        PENDING = "pending"
        ACCEPTED = "accepted"
        DISMISSED = "dismissed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="email_suggestions")
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="suggestions")
    message_id = models.CharField(max_length=64)
    subject = models.CharField(max_length=300, blank=True)
    snippet = models.CharField(max_length=400, blank=True)
    suggested_status = models.CharField(max_length=20)
    state = models.CharField(max_length=10, choices=State.choices, default=State.PENDING)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "message_id"], name="uniq_user_message")]