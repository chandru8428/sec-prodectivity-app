from django.urls import path

from .views import (
    healthcheck,
    optimize_view,
    parse_view,
    sample_data_view,
    timetables_view,
)


urlpatterns = [
    path('health/', healthcheck, name='healthcheck'),
    path('parse', parse_view, name='parse'),
    path('optimize', optimize_view, name='optimize'),
    path('timetables', timetables_view, name='timetables'),
    path('sample-data', sample_data_view, name='sample-data'),
]
