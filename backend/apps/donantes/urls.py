"""
Rutas URL para la app Donantes (CU05).
"""
from django.urls import path
from .views import DonanteCarnetDigitalView

urlpatterns = [
    # [CU05] Consultar Carnet Digital e Historial Biológico del Donante
    path('<str:ci>/carnet/', DonanteCarnetDigitalView.as_view(), name='donante_carnet_digital'),
]
