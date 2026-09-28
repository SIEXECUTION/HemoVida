"""
URL configuration for hemovida_project.
Rutas centrales de la API REST de HemoVida.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # CU01, CU02, CU03: Seguridad, Autenticación, Usuarios, Personal y Auditoría
    path('api/', include('apps.seguridad.urls')),
    
    # CU04: Parámetros de Stock y Alertas Críticas
    path('api/stock/', include('apps.inventario.urls')),
    
    # CU05: Carnet Digital y Donantes
    path('api/donantes/', include('apps.donantes.urls')),
]
