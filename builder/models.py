from django.db import models


class SavedTimetable(models.Model):
    title = models.CharField(max_length=255, default='AI Timetable')
    raw_input = models.TextField(blank=True)
    selected_slots = models.JSONField(default=list)
    weekly_timetable = models.JSONField(default=dict)
    summary = models.JSONField(default=dict)
    constraints = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.created_at:%Y-%m-%d %H:%M})'
