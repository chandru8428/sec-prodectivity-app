from rest_framework import serializers

from .models import SavedTimetable


class SavedTimetableSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedTimetable
        fields = [
            'id',
            'title',
            'raw_input',
            'selected_slots',
            'weekly_timetable',
            'summary',
            'constraints',
            'created_at',
        ]
