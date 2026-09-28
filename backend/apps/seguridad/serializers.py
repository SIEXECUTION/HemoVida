"""
Serializadores para Seguridad, Autenticación y Auditoría (CU01, CU02, CU03).
"""
from rest_framework import serializers
from .models import Usuario, Rol, Persona, PersonalSalud, BitacoraAuditoria
from .validators import validate_password_complexity
from .utils import generate_tokens_for_usuario

class LoginSerializer(serializers.Serializer):
    """
    Serializador para el Caso de Uso [CU01]: Iniciar Sesión.
    Valida credenciales, estado activo y genera tokens JWT con datos del usuario.
    """
    username = serializers.CharField(required=True, trim_whitespace=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        try:
            # Búsqueda por username o por email institucional
            if '@' in username:
                usuario = Usuario.objects.select_related('persona', 'rol').get(email__iexact=username)
            else:
                usuario = Usuario.objects.select_related('persona', 'rol').get(username=username)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError({"detail": "Credenciales inválidas. Usuario no encontrado."})

        # Comprobar contraseña (soporta hash Django y contraseñas precargadas en SQL)
        if not usuario.check_password(password):
            raise serializers.ValidationError({"detail": "Credenciales inválidas. Contraseña incorrecta."})

        # Regla de Negocio: Validar que el usuario esté en estado = 'Activo'
        if usuario.estado != 'Activo':
            raise serializers.ValidationError({
                "detail": f"Acceso denegado. La cuenta se encuentra en estado '{usuario.estado}'."
            })

        # Generar tokens JWT
        tokens = generate_tokens_for_usuario(usuario)

        persona = usuario.persona
        data = {
            'tokens': tokens,
            'usuario': {
                'idUsuario': usuario.idUsuario,
                'username': usuario.username,
                'email': usuario.email,
                'estado': usuario.estado,
                'rol': {
                    'idRol': usuario.rol.idRol,
                    'nombreRol': usuario.rol.nombreRol,
                },
                'persona': {
                    'idPersona': persona.idPersona if persona else None,
                    'ci': persona.ci if persona else None,
                    'nombres': persona.nombres if persona else None,
                    'apellidos': persona.apellidos if persona else None,
                    'nombreCompleto': persona.nombreCompleto if persona else None,
                } if persona else None
            }
        }
        return data


class UsuarioRegistrarSerializer(serializers.ModelSerializer):
    """
    Serializador para el Caso de Uso [CU02]: Registrar Nuevo Usuario con Validación Segura.
    """
    password = serializers.CharField(write_only=True, required=True)
    idRol = serializers.IntegerField(write_only=True, required=True)
    idPersona = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Usuario
        fields = ['idUsuario', 'username', 'email', 'password', 'idRol', 'idPersona', 'estado']
        read_only_fields = ['idUsuario', 'estado']

    def validate_password(self, value):
        # Valida contra la política del Trigger T1 (Mínimo 8 caracteres, mayúscula, minúscula, número, especial)
        validate_password_complexity(value)
        return value

    def validate_idRol(self, value):
        if not Rol.objects.filter(idRol=value).exists():
            raise serializers.ValidationError("El rol especificado no existe.")
        return value

    def validate_idPersona(self, value):
        if value is not None:
            if not Persona.objects.filter(idPersona=value).exists():
                raise serializers.ValidationError("La persona especificada no existe.")
            if Usuario.objects.filter(persona_id=value).exists():
                raise serializers.ValidationError("Ya existe un usuario asignado a esta persona.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        id_rol = validated_data.pop('idRol')
        id_persona = validated_data.pop('idPersona', None)

        rol = Rol.objects.get(idRol=id_rol)
        persona = Persona.objects.get(idPersona=id_persona) if id_persona else None

        usuario = Usuario(
            username=validated_data['username'],
            email=validated_data['email'],
            rol=rol,
            persona=persona,
            estado='Activo'
        )
        usuario.set_password(password)
        usuario.save()
        return usuario


class PersonalSaludListSerializer(serializers.ModelSerializer):
    """
    Serializador para replicar la Consulta C4 / Consulta 6 del sistema:
    Matriz de usuarios del personal de salud clasificados por rol institucional.
    """
    idUsuario = serializers.IntegerField(source='usuario.idUsuario', default=None)
    username = serializers.CharField(source='usuario.username', default=None)
    email = serializers.CharField(source='usuario.email', default=None)
    nombreRol = serializers.CharField(source='usuario.rol.nombreRol', default='Sin Rol Asignado')
    estadoUsuario = serializers.CharField(source='usuario.estado', default='Inactivo')
    ci = serializers.CharField(source='persona.ci')
    nombreCompleto = serializers.CharField(source='persona.nombreCompleto')

    class Meta:
        model = PersonalSalud
        fields = [
            'idUsuario',
            'username',
            'email',
            'nombreRol',
            'cargo',
            'registroProfesional',
            'estadoUsuario',
            'ci',
            'nombreCompleto',
            'estado'
        ]


class UsuarioEstadoUpdateSerializer(serializers.Serializer):
    """
    Serializador para cambiar el estado de un usuario (Activar / Suspender / Bloquear).
    """
    estado = serializers.ChoiceField(
        choices=[('Activo', 'Activo'), ('Inactivo', 'Inactivo'), ('Bloqueado', 'Bloqueado')],
        required=True
    )


class BitacoraAuditoriaSerializer(serializers.ModelSerializer):
    """
    Serializador para el Caso de Uso [CU03]: Consulta y Auditoría Forense.
    """
    username = serializers.CharField(source='usuario.username', default='Sistema / Anónimo')
    nombreRol = serializers.CharField(source='usuario.rol.nombreRol', default='N/A')
    funcionario = serializers.SerializerMethodField()

    class Meta:
        model = BitacoraAuditoria
        fields = [
            'idAuditoria',
            'fechaHora',
            'username',
            'funcionario',
            'nombreRol',
            'accionRealizada',
            'tablaAfectada',
            'idRegistroAfectado',
            'ipOrigen',
        ]

    def get_funcionario(self, obj):
        if obj.usuario and obj.usuario.persona:
            return obj.usuario.persona.nombreCompleto
        return 'N/A'
