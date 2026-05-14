import json
from pathlib import Path

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import SavedTimetable
from .serializers import SavedTimetableSerializer
from .services import OptimizationError, optimize_subjects, parse_timetable_text


@api_view(['GET'])
def healthcheck(request):
    return Response({'status': 'ok'})


@api_view(['POST'])
def parse_view(request):
    raw_text = request.data.get('raw_text', '').strip()
    if not raw_text:
        return Response({'detail': 'raw_text is required.'}, status=status.HTTP_400_BAD_REQUEST)

    parsed = parse_timetable_text(raw_text)
    return Response(parsed)


@api_view(['POST'])
def optimize_view(request):
    payload = request.data
    subjects = payload.get('subjects') or []
    selected_subject_codes = payload.get('selected_subject_codes') or []
    preferences = payload.get('preferences') or {}

    if not subjects:
        return Response({'detail': 'subjects are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not selected_subject_codes:
        return Response({'detail': 'selected_subject_codes are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = optimize_subjects(subjects, selected_subject_codes, preferences)
    except OptimizationError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)


@api_view(['GET', 'POST'])
def timetables_view(request):
    if request.method == 'GET':
        timetables = SavedTimetable.objects.all()[:20]
        return Response(SavedTimetableSerializer(timetables, many=True).data)

    serializer = SavedTimetableSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def sample_data_view(request):
    sample_path = Path(__file__).resolve().parent.parent / 'backend' / 'sample_data' / 'sample_timetable.txt'
    sample_text = sample_path.read_text(encoding='utf-8')
    parsed = parse_timetable_text(sample_text)
    return Response({'raw_text': sample_text, 'parsed': parsed})
