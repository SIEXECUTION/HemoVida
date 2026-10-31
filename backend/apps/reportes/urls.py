from django.urls import path
from .views import Catalogo, Consulta

urlpatterns = [
    path("catalogo/", Catalogo.as_view()),
    path("consulta/", Consulta.as_view()),
]
