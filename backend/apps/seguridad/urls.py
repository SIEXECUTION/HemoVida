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
    PasswordResetRequestView,
    PasswordResetConfirmView,
    PasswordChangeView,
)

urlpatterns = [
    # Autenticar Usuario e Iniciar Sesión
    path('auth/login/', LoginView.as_view(), name='auth_login'),

    # Recuperación y Cambio de Contraseña
    path('auth/recuperar-password/solicitar/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/recuperar-password/confirmar/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/cambiar-password/', PasswordChangeView.as_view(), name='password_change'),

    # Gestión de Personal y Roles RBAC
    path('usuarios/registrar/', UsuarioRegistrarView.as_view(), name='usuario_registrar'),
    path('personal/', PersonalSaludListView.as_view(), name='personal_list'),
    path('usuarios/<int:pk>/estado/', UsuarioEstadoUpdateView.as_view(), name='usuario_estado_update'),

    # Consultar y Auditar Bitácora de Eventos Forenses
    path('auditoria/', BitacoraAuditoriaListView.as_view(), name='auditoria_list'),
]
