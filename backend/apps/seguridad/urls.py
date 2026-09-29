"""
Rutas URL para la app de Seguridad (CU01, CU02, CU03).
"""
from django.urls import path
from .views import (
    LoginView,
    AutoRegistroPosibleDonadorView,
    CrearPersonalSaludView,
    PersonalSaludListView,
    UsuarioEstadoUpdateView,
    BitacoraAuditoriaListView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    PasswordChangeView,
)

urlpatterns = [
    # Autenticar Usuario e Iniciar Sesión (Selector de Perfiles)
    path('auth/login/', LoginView.as_view(), name='auth_login'),

    # Procedimiento 1: Auto-Registro Público de Posible Donador (Sin Admin)
    path('auth/autoregistro/', AutoRegistroPosibleDonadorView.as_view(), name='auth_autoregistro'),
    path('usuarios/autoregistro/', AutoRegistroPosibleDonadorView.as_view(), name='usuarios_autoregistro'),

    # Procedimiento 2: Alta de Personal de Salud (Solo Ejecutable por Administrador)
    path('personal/crear/', CrearPersonalSaludView.as_view(), name='personal_crear'),

    # Gestión de Personal y Roles RBAC
    path('personal/', PersonalSaludListView.as_view(), name='personal_list'),
    path('usuarios/<int:pk>/estado/', UsuarioEstadoUpdateView.as_view(), name='usuario_estado_update'),

    # Recuperación y Cambio de Contraseña
    path('auth/recuperar-password/solicitar/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/recuperar-password/confirmar/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/cambiar-password/', PasswordChangeView.as_view(), name='password_change'),

    # Consultar y Auditar Bitácora de Eventos Forenses
    path('auditoria/', BitacoraAuditoriaListView.as_view(), name='auditoria_list'),
]
