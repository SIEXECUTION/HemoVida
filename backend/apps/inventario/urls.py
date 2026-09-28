"""
Rutas URL para la app Inventario (CU04).
"""
from django.urls import path
from .views import (
    ParametroStockMinimoListView,
    ParametroStockMinimoUpdateView,
    StockAlertasListView,
)

urlpatterns = [
    # [CU04] Parametrizar Umbrales de Stock Mínimo y Alertas Críticas
    path('parametros/', ParametroStockMinimoListView.as_view(), name='stock_parametros_list'),
    path('parametros/<int:pk>/', ParametroStockMinimoUpdateView.as_view(), name='stock_parametros_update'),
    path('alertas/', StockAlertasListView.as_view(), name='stock_alertas_list'),
]
