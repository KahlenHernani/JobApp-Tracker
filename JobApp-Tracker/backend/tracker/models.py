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