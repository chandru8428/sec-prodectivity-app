from django.contrib import admin
from .models import SavedTimetable


@admin.register(SavedTimetable)
class SavedTimetableAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'created_at')
    search_fields = ('title',)
