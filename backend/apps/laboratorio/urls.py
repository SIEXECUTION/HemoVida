from django.urls import path, re_path
from .views import AnalisisView, LiberarView, LotesView, CorreccionGrupoView

urlpatterns = [
    path('madres/<int:madre>/corregir-grupo/', CorreccionGrupoView.as_view()),
    path('madres/', LotesView.as_view()),
    path('madres/<int:madre>/', LotesView.as_view()),
    re_path(r'^madres/(?P<madre>[0-9]+)/(?P<tipo>serologia|hematologia)/$', AnalisisView.as_view()),
    re_path(r'^madres/(?P<madre>[0-9]+)/(?P<tipo>serologia|hematologia)/(?P<analisis_id>[0-9]+)/$', AnalisisView.as_view()),
    path('madres/<int:madre>/liberar/', LiberarView.as_view()),
]
