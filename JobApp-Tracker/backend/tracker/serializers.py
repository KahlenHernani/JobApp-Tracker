from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers

from .models import Application, ApplicationEvent, Interview, Project, Resume

User = get_user_model()

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationEvent
        fields = ["id", "event_type", "date", "description"]


class InterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = [
            "id", "application", "interview_type", "date",
            "interviewer", "meeting_link", "notes",
        ]

    def validate_application(self, application):
        # Users can only attach interviews to their own applications.
        if application.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("Application not found.")
        return application


class ApplicationSerializer(serializers.ModelSerializer):
    events = EventSerializer(many=True, read_only=True)
    interviews = InterviewSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            "id", "company", "position", "location", "job_type", "salary",
            "application_url", "status", "date_saved", "date_applied",
            "deadline", "notes", "job_description", "events", "interviews",
        ]
        read_only_fields = ["date_saved"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is taken.")
        return value

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

class ProjectSerializer(serializers.ModelSerializer):
    tech = serializers.ListField(child=serializers.CharField(max_length=60), max_length=20, required=False)
    bullets = serializers.ListField(child=serializers.CharField(max_length=600), max_length=8, required=False)

    class Meta:
        model = Project
        fields = ["id", "name", "tech", "bullets", "link", "created"]
        read_only_fields = ["created"]


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ["id", "name", "text", "updated"]
        read_only_fields = ["updated"]
        extra_kwargs = {"text": {"max_length": 20000}}