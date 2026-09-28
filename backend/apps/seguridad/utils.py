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

def registrar_auditoria(usuario, accion: str, tabla: str, id_registro: int = 0, ip_origen: str = '127.0.0.1', **kwargs) -> BitacoraAuditoria:
    """
    Registra un evento transaccional en la tabla BitacoraAuditoria.
    """
    reg_id = kwargs.get('idRegistroAfectado', id_registro) or 0
    usuario_obj = usuario if isinstance(usuario, Usuario) else None
    return BitacoraAuditoria.objects.create(
        usuario=usuario_obj,
        accionRealizada=accion,
        tablaAfectada=tabla,
        idRegistroAfectado=reg_id,
        ipOrigen=ip_origen or '127.0.0.1'
    )

def generate_tokens_for_usuario(usuario: Usuario) -> dict:
    """
    Genera un par de tokens JWT (Access y Refresh) conteniendo los claims institucionales.
    """
    refresh = RefreshToken()
    # Claims en el payload del token
    refresh['user_id'] = usuario.idUsuario
    refresh['username'] = usuario.username
    refresh['email'] = usuario.email
    refresh['idRol'] = usuario.rol.idRol
    refresh['nombreRol'] = usuario.rol.nombreRol
    if usuario.persona:
        refresh['ci'] = usuario.persona.ci
        refresh['nombres'] = usuario.persona.nombres
        refresh['apellidos'] = usuario.persona.apellidos

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }
