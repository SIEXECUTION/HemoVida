from django.urls import path
from .views import Catalogo, Consulta
from .static_views import CatalogoEstatico, InformeEstatico

urlpatterns = [
    path('estaticos/catalogo/', CatalogoEstatico.as_view()),
    path('estaticos/informe/', InformeEstatico.as_view()),
    path("catalogo/", Catalogo.as_view()),
    path("consulta/", Consulta.as_view()),
]
