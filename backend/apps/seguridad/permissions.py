"""
Permisos RBAC para el sistema HemoVida.
"""
from rest_framework import permissions

class IsAdminRole(permissions.BasePermission):
    """
    Permite el acceso exclusivamente a usuarios con rol de Administrador.
    """
    message = "Se requieren privilegios de Administrador del Sistema para realizar esta acción."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Comprobar estado activo
        if getattr(request.user, 'estado', None) != 'Activo':
            return False

        # Comprobar nombre de rol
        rol_nombre = getattr(getattr(request.user, 'rol', None), 'nombreRol', '')
        return 'Administrador' in rol_nombre or getattr(request.user, 'is_staff', False)


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

        rol_nombre = getattr(getattr(request.user, 'rol', None), 'nombreRol', '')
        roles_permitidos = [
            'Administrador del Sistema',
            'Secretaría y Admisión',
            'Médico Evaluador de Triaje',
            'Bioquímico Serólogo',
            'Bioquímico Inmunohematólogo',
            'Técnico de Fraccionamiento y Almacén',
        ]
        return any(rol in rol_nombre for rol in roles_permitidos)
