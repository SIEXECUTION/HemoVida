"""
Rutas URL para la app de Seguridad (CU01, CU02, CU03).
"""
from django.urls import path
from .views import (
    LoginView,
    UsuarioRegistrarView,
    PersonalSaludListView,
    UsuarioEstadoUpdateView,
    BitacoraAuditoriaListView,
)

urlpatterns = [
    # [CU01] Autenticar Usuario e Iniciar Sesión
    path('auth/login/', LoginView.as_view(), name='auth_login'),

    # [CU02] Gestión de Personal y Roles RBAC
    path('usuarios/registrar/', UsuarioRegistrarView.as_view(), name='usuario_registrar'),
    path('personal/', PersonalSaludListView.as_view(), name='personal_list'),
    path('usuarios/<int:pk>/estado/', UsuarioEstadoUpdateView.as_view(), name='usuario_estado_update'),

    # [CU03] Consultar y Auditar Bitácora de Eventos Forenses
    path('auditoria/', BitacoraAuditoriaListView.as_view(), name='auditoria_list'),
]
