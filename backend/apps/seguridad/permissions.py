"""
Permisos RBAC para el sistema HemoVida basados en UsuarioRol.
"""
from rest_framework import permissions

class IsAdminRole(permissions.BasePermission):
    """
    Permite el acceso exclusivamente a usuarios con rol de Administrador (ADMIN).
    """
    message = "Se requieren privilegios de Administrador del Sistema para realizar esta acción."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Comprobar estado activo
        if getattr(request.user, 'estado', None) != 'Activo':
            return False

        # Comprobar rol ADMIN en la tabla UsuarioRol
        if hasattr(request.user, 'roles'):
            return request.user.roles.filter(codigoRol='ADMIN').exists()
        return False


class IsHealthStaffRole(permissions.BasePermission):
    """
    Permite el acceso a personal de salud autorizado y administradores.
    """
    message = "Se requiere pertenecer al personal asistencial o administrativo autorizado."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, 'estado', None) != 'Activo':
            return False

        roles_salud = [
            'ADMIN',
            'DOC_TRIAJE',
            'PERS_COLECTA',
            'BIOQ_INTEGRAL',
            'TEC_LOGISTICA',
            'MED_SOLICITANTE'
        ]
        if hasattr(request.user, 'roles'):
            return request.user.roles.filter(codigoRol__in=roles_salud).exists()
        return False
