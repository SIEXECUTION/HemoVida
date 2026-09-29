"""
Utilidades de seguridad y auditoría para HemoVida.
"""
from rest_framework_simplejwt.tokens import RefreshToken
from .models import BitacoraAuditoria, Usuario

def get_client_ip(request) -> str:
    """
    Obtiene la dirección IP real del cliente que realiza la petición HTTP.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip or '127.0.0.1'

def registrar_auditoria(
    usuario, 
    accion: str, 
    tabla: str, 
    id_registro: int = 0, 
    ip_origen: str = '127.0.0.1', 
    rol_activo: str = None, 
    **kwargs
) -> BitacoraAuditoria:
    """
    Registra un evento transaccional en la tabla BitacoraAuditoria con rolActivo.
    """
    raw_id = kwargs.get('idRegistroAfectado', id_registro)
    try:
        reg_id = int(raw_id) if raw_id is not None and str(raw_id).isdigit() else 0
    except (ValueError, TypeError):
        reg_id = 0

    usuario_obj = usuario if isinstance(usuario, Usuario) else None
    rol_efectivo = rol_activo
    if not rol_efectivo and usuario_obj:
        # Si no viene rol activo explícito, tomar el primer rol asignado
        primer_rol = usuario_obj.roles.first()
        rol_efectivo = primer_rol.nombreRol if primer_rol else 'Sin Rol'

    return BitacoraAuditoria.objects.create(
        usuario=usuario_obj,
        rolActivo=(rol_efectivo or 'Posible Donador')[:60],
        accionRealizada=accion[:255] if accion else 'Operación en Plataforma',
        tablaAfectada=tabla[:60] if tabla else 'Usuario',
        idRegistroAfectado=reg_id,
        ipOrigen=(ip_origen or '127.0.0.1')[:45]
    )

def generate_tokens_for_usuario(usuario: Usuario, rol_activo: str = None) -> dict:
    """
    Genera un par de tokens JWT (Access y Refresh) conteniendo los claims institucionales y lista de roles.
    """
    refresh = RefreshToken()
    # Claims en el payload del token
    refresh['user_id'] = usuario.idUsuario
    refresh['username'] = usuario.username
    refresh['email'] = usuario.email
    
    roles_list = list(usuario.roles.values('idRol', 'codigoRol', 'nombreRol'))
    refresh['roles'] = [r['codigoRol'] for r in roles_list]
    if rol_activo:
        refresh['rolActivo'] = rol_activo
    elif roles_list:
        refresh['rolActivo'] = roles_list[0]['codigoRol']

    if usuario.persona:
        refresh['ci'] = usuario.persona.ci
        refresh['nombres'] = usuario.persona.nombres
        refresh['apellidos'] = usuario.persona.apellidos
        refresh['nombreCompleto'] = usuario.persona.nombreCompleto

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }
