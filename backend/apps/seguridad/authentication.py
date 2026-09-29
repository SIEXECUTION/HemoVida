"""
Autenticación JWT personalizada para el modelo Usuario de HemoVida.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from .models import Usuario

class CustomJWTAuthentication(JWTAuthentication):
    """
    Autenticador JWT que recupera la entidad Usuario de HemoVida
    a partir del claim 'user_id' contenido en el token de acceso.
    """
    def get_user(self, validated_token):
        user_id = validated_token.get('user_id')
        if not user_id:
            raise InvalidToken('El token JWT no contiene un identificador de usuario válido.')
        
        try:
            usuario = Usuario.objects.select_related('persona').prefetch_related('roles').get(idUsuario=user_id)
        except Usuario.DoesNotExist:
            raise AuthenticationFailed('El usuario referenciado en el token no existe.')

        if usuario.estado != 'Activo':
            raise AuthenticationFailed('La cuenta del usuario se encuentra inactiva o bloqueada.')

        return usuario
