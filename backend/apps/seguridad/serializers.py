"""
Serializadores para Seguridad, Autenticación y Auditoría (CU01, CU02, CU03)
adaptados al modelo relacional con RBAC múltiple (UsuarioRol) y Stored Procedures.
"""
from rest_framework import serializers
from django.db import connection, transaction
from .models import Usuario, Rol, UsuarioRol, Persona, PersonalSalud, BitacoraAuditoria
from .validators import validate_password_complexity
from .utils import generate_tokens_for_usuario, get_client_ip, registrar_auditoria

class LoginSerializer(serializers.Serializer):
    """
    Serializador para el Caso de Uso [CU01]: Iniciar Sesión.
    Valida credenciales institucionales, estado activo y genera respuesta estructurada
    con selector de perfiles ('rolesDisponibles') de acuerdo al diseño técnico (Pág 20 del PDF).
    """
    username = serializers.CharField(required=True, trim_whitespace=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        login_val = attrs.get('username')
        password = attrs.get('password')

        try:
            # Búsqueda por username o por email institucional
            if '@' in login_val:
                usuario = Usuario.objects.select_related('persona').prefetch_related('roles').get(email__iexact=login_val)
            else:
                usuario = Usuario.objects.select_related('persona').prefetch_related('roles').get(username=login_val)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError({"detail": "Credenciales inválidas. Usuario no encontrado."})

        # Comprobar contraseña
        if not usuario.check_password(password):
            raise serializers.ValidationError({"detail": "Credenciales inválidas. Contraseña incorrecta."})

        # Regla de Negocio: Validar que el usuario esté en estado = 'Activo'
        if usuario.estado != 'Activo':
            raise serializers.ValidationError({
                "detail": f"Acceso denegado. La cuenta se encuentra en estado '{usuario.estado}'."
            })

        # Obtener lista de roles asignados en UsuarioRol
        roles_list = list(usuario.roles.all())
        roles_disponibles = [
            {"id": r.idRol, "codigo": r.codigoRol, "nombre": r.nombreRol}
            for r in roles_list
        ]

        # Generar tokens JWT
        tokens = generate_tokens_for_usuario(usuario)

        persona = usuario.persona
        nombre_completo = persona.nombreCompleto if persona else usuario.username

        # Formato exacto de respuesta según Especificación Técnica (Página 20)
        data = {
            "usuarioId": usuario.idUsuario,
            "nombreCompleto": nombre_completo,
            "token": tokens['access'],
            "tokens": tokens,
            "rolesDisponibles": roles_disponibles,
            "usuario": {
                "idUsuario": usuario.idUsuario,
                "username": usuario.username,
                "email": usuario.email,
                "estado": usuario.estado,
                "roles": roles_disponibles,
                "persona": {
                    "idPersona": persona.idPersona,
                    "ci": persona.ci,
                    "nombres": persona.nombres,
                    "apellidos": persona.apellidos,
                    "nombreCompleto": persona.nombreCompleto,
                    "sexo": persona.sexo,
                    "fechaNacimiento": str(persona.fechaNacimiento),
                    "celular": persona.celular,
                    "direccion": persona.direccion,
                    "ocupacion": persona.ocupacion,
                    "nacionalidad": persona.nacionalidad,
                } if persona else None
            }
        }
        return data


class AutoRegistroPosibleDonadorSerializer(serializers.Serializer):
    """
    Serializador para Procedimiento 1: Auto-Registro Público de Posible Donador (Sin Admin).
    Ejecuta sp_autoregistro_posible_donador o lógica equivalente.
    """
    ci = serializers.CharField(max_length=20, required=True)
    nombres = serializers.CharField(max_length=80, required=True)
    apellidos = serializers.CharField(max_length=80, required=True)
    sexo = serializers.ChoiceField(choices=['M', 'F', 'O'], required=True)
    fechaNacimiento = serializers.DateField(required=True)
    direccion = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    celular = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    ocupacion = serializers.CharField(max_length=80, required=False, allow_blank=True, default='')
    username = serializers.CharField(max_length=50, required=True)
    email = serializers.EmailField(max_length=100, required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate_password(self, value):
        validate_password_complexity(value)
        return value

    def validate_ci(self, value):
        if Persona.objects.filter(ci__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una persona registrada con esta cédula de identidad.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya se encuentra en uso.")
        return value

    def validate_email(self, value):
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("El correo electrónico ya se encuentra registrado.")
        return value

    def create(self, validated_data):
        from apps.donantes.models import PosibleDonador
        
        ci = validated_data['ci']
        nombres = validated_data['nombres']
        apellidos = validated_data['apellidos']
        sexo = validated_data['sexo']
        fecha_nac = validated_data['fechaNacimiento']
        direccion = validated_data.get('direccion', '')
        celular = validated_data.get('celular', '')
        ocupacion = validated_data.get('ocupacion', '')
        username = validated_data['username']
        email = validated_data['email']
        password = validated_data['password']

        # Intentar llamada directa al Stored Procedure en PostgreSQL/Supabase
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CALL sp_autoregistro_posible_donador(
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    );
                    """,
                    [ci, nombres, apellidos, sexo, fecha_nac, direccion, celular, ocupacion, username, email, password]
                )
            usuario = Usuario.objects.select_related('persona').prefetch_related('roles').get(username=username)
            return usuario
        except Exception as e:
            # Fallback ORM equivalente en caso de entornos de desarrollo/test
            with transaction.atomic():
                persona = Persona.objects.create(
                    ci=ci,
                    nombres=nombres,
                    apellidos=apellidos,
                    sexo=sexo,
                    fechaNacimiento=fecha_nac,
                    direccion=direccion,
                    celular=celular,
                    ocupacion=ocupacion,
                    nacionalidad='Boliviana'
                )
                usuario = Usuario(
                    persona=persona,
                    username=username,
                    email=email,
                    estado='Activo'
                )
                usuario.set_password(password)
                usuario.save()

                PosibleDonador.objects.create(
                    persona=persona,
                    estadoAptitud='No Apto',
                    tieneAnalisis=False
                )

                rol_posible = Rol.objects.filter(codigoRol='POSIBLE_DONADOR').first()
                if rol_posible:
                    UsuarioRol.objects.create(usuario=usuario, rol=rol_posible)

                registrar_auditoria(
                    usuario=usuario,
                    accion='Auto-registro de postulante web',
                    tabla='Usuario',
                    id_registro=usuario.idUsuario,
                    ip_origen='0.0.0.0',
                    rol_activo='Posible Donador'
                )
                return usuario


class CrearPersonalSaludSerializer(serializers.Serializer):
    """
    Serializador para Procedimiento 2: Alta de Personal de Salud (Solo Ejecutable por Administrador).
    Ejecuta sp_crear_usuario_personal_salud o lógica equivalente.
    """
    ci = serializers.CharField(max_length=20, required=True)
    nombres = serializers.CharField(max_length=80, required=True)
    apellidos = serializers.CharField(max_length=80, required=True)
    sexo = serializers.ChoiceField(choices=['M', 'F', 'O'], required=True)
    fechaNacimiento = serializers.DateField(required=True)
    celular = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    cargo = serializers.CharField(max_length=80, required=True)
    registroProfesional = serializers.CharField(max_length=40, required=True)
    username = serializers.CharField(max_length=50, required=True)
    email = serializers.EmailField(max_length=100, required=True)
    password = serializers.CharField(write_only=True, required=True)
    codigoRolAsignar = serializers.CharField(max_length=30, required=True)

    def validate_password(self, value):
        validate_password_complexity(value)
        return value

    def validate_codigoRolAsignar(self, value):
        val_upper = value.strip().upper()
        if val_upper in ('POSIBLE_DONADOR', 'DONANTE'):
            raise serializers.ValidationError("No se puede asignar un rol de postulante o donante como personal operativo.")
        if not Rol.objects.filter(codigoRol=val_upper).exists():
            raise serializers.ValidationError(f"El rol con código '{value}' no existe en el catálogo oficial.")
        return val_upper

    def validate_registroProfesional(self, value):
        if PersonalSalud.objects.filter(registroProfesional__iexact=value).exists():
            raise serializers.ValidationError("El registro profesional / matrícula ya está asignado.")
        return value

    def validate_ci(self, value):
        if Persona.objects.filter(ci__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una persona registrada con este documento de identidad.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("El nombre de usuario institucional ya está en uso.")
        return value

    def validate_email(self, value):
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("El correo electrónico institucional ya se encuentra registrado.")
        return value

    def create_for_admin(self, admin_user, validated_data):
        ci = validated_data['ci']
        nombres = validated_data['nombres']
        apellidos = validated_data['apellidos']
        sexo = validated_data['sexo']
        fecha_nac = validated_data['fechaNacimiento']
        celular = validated_data.get('celular', '')
        cargo = validated_data['cargo']
        reg_prof = validated_data['registroProfesional']
        username = validated_data['username']
        email = validated_data['email']
        password = validated_data['password']
        cod_rol = validated_data['codigoRolAsignar']

        # Intentar ejecutar el Stored Procedure en Supabase/PostgreSQL
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CALL sp_crear_usuario_personal_salud(
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    );
                    """,
                    [
                        admin_user.idUsuario, ci, nombres, apellidos, sexo, fecha_nac,
                        celular, cargo, reg_prof, username, email, password, cod_rol
                    ]
                )
            nuevo_usuario = Usuario.objects.select_related('persona').prefetch_related('roles').get(username=username)
            return nuevo_usuario
        except Exception as e:
            # Fallback ORM equivalente en caso de entornos de test
            with transaction.atomic():
                persona = Persona.objects.create(
                    ci=ci,
                    nombres=nombres,
                    apellidos=apellidos,
                    sexo=sexo,
                    fechaNacimiento=fecha_nac,
                    celular=celular,
                    ocupacion=cargo,
                    nacionalidad='Boliviana'
                )
                PersonalSalud.objects.create(
                    persona=persona,
                    cargo=cargo,
                    registroProfesional=reg_prof
                )
                nuevo_usuario = Usuario(
                    persona=persona,
                    username=username,
                    email=email,
                    estado='Activo'
                )
                nuevo_usuario.set_password(password)
                nuevo_usuario.save()

                rol = Rol.objects.get(codigoRol=cod_rol)
                UsuarioRol.objects.create(usuario=nuevo_usuario, rol=rol)

                registrar_auditoria(
                    usuario=admin_user,
                    accion=f"Alta de personal de salud: {username} con rol {cod_rol}",
                    tabla='Usuario',
                    id_registro=nuevo_usuario.idUsuario,
                    ip_origen='127.0.0.1',
                    rol_activo='Administrador'
                )
                return nuevo_usuario


class PersonalSaludListSerializer(serializers.ModelSerializer):
    """
    Serializador para la Matriz de personal de salud clasificados por rol institucional.
    """
    idUsuario = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    rolesDisponibles = serializers.SerializerMethodField()
    nombreRol = serializers.SerializerMethodField()
    estadoUsuario = serializers.SerializerMethodField()
    ci = serializers.CharField(source='persona.ci')
    nombreCompleto = serializers.CharField(source='persona.nombreCompleto')

    class Meta:
        model = PersonalSalud
        fields = [
            'idUsuario',
            'username',
            'email',
            'nombreRol',
            'rolesDisponibles',
            'cargo',
            'registroProfesional',
            'estadoUsuario',
            'ci',
            'nombreCompleto',
        ]

    def get_idUsuario(self, obj):
        usuario = getattr(obj.persona, 'usuario', None)
        return usuario.idUsuario if usuario else None

    def get_username(self, obj):
        usuario = getattr(obj.persona, 'usuario', None)
        return usuario.username if usuario else None

    def get_email(self, obj):
        usuario = getattr(obj.persona, 'usuario', None)
        return usuario.email if usuario else None

    def get_estadoUsuario(self, obj):
        usuario = getattr(obj.persona, 'usuario', None)
        return usuario.estado if usuario else 'Inactivo'

    def get_rolesDisponibles(self, obj):
        usuario = getattr(obj.persona, 'usuario', None)
        if usuario:
            return [
                {"id": r.idRol, "codigo": r.codigoRol, "nombre": r.nombreRol}
                for r in usuario.roles.all()
            ]
        return []

    def get_nombreRol(self, obj):
        roles = self.get_rolesDisponibles(obj)
        if roles:
            return ", ".join([r['nombre'] for r in roles])
        return 'Sin Rol Asignado'


class UsuarioEstadoUpdateSerializer(serializers.Serializer):
    """
    Serializador para cambiar el estado de un usuario (Activo / Inactivo / Bloqueado).
    """
    estado = serializers.ChoiceField(
        choices=[('Activo', 'Activo'), ('Inactivo', 'Inactivo'), ('Bloqueado', 'Bloqueado')],
        required=True
    )


class BitacoraAuditoriaSerializer(serializers.ModelSerializer):
    """
    Serializador para el Caso de Uso [CU03]: Consulta y Auditoría Forense.
    Incluye rolActivo y datos extendidos de Usuario y Persona.
    """
    idUsuario = serializers.IntegerField(source='usuario.idUsuario', default=None, allow_null=True)
    username = serializers.CharField(source='usuario.username', default='Sistema / Anónimo')
    nombreRol = serializers.CharField(source='rolActivo', default='N/A')
    funcionario = serializers.SerializerMethodField()
    ci = serializers.SerializerMethodField()
    nacionalidad = serializers.SerializerMethodField()

    class Meta:
        model = BitacoraAuditoria
        fields = [
            'idAuditoria',
            'idUsuario',
            'fechaHora',
            'username',
            'funcionario',
            'ci',
            'nacionalidad',
            'rolActivo',
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

    def get_ci(self, obj):
        if obj.usuario and obj.usuario.persona:
            return obj.usuario.persona.ci
        return 'N/A'

    def get_nacionalidad(self, obj):
        if obj.usuario and obj.usuario.persona:
            return getattr(obj.usuario.persona, 'nacionalidad', 'Boliviana') or 'Boliviana'
        return 'Boliviana'
