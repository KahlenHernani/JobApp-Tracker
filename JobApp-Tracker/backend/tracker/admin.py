from django.contrib import admin

from .models import Application, ApplicationEvent, Interview

admin.site.register(Application)
admin.site.register(Interview)
admin.site.register(ApplicationEvent)