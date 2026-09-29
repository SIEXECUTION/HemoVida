"""
Modelos ORM para la app de Seguridad y Auditoría de HemoVida.
Mapeo de tablas de PostgreSQL (Supabase):
- persona
- rol
- usuariorol
- usuario
- personalsalud
- bitacoraauditoria
"""
from django.db import models
from django.contrib.auth.hashers import check_password, make_password

class Persona(models.Model):
    idPersona = models.AutoField(primary_key=True, db_column='idpersona')
    ci = models.CharField(max_length=20, unique=True, db_column='ci')
    nombres = models.CharField(max_length=80, db_column='nombres')
    apellidos = models.CharField(max_length=80, db_column='apellidos')
    sexo = models.CharField(
        max_length=1, 
        choices=[('M', 'Masculino'), ('F', 'Femenino'), ('O', 'Otro')],
        db_column='sexo'
    )
    fechaNacimiento = models.DateField(db_column='fechanacimiento')
    direccion = models.CharField(max_length=150, null=True, blank=True, db_column='direccion')
    celular = models.CharField(max_length=20, null=True, blank=True, db_column='celular')
    ocupacion = models.CharField(max_length=80, null=True, blank=True, db_column='ocupacion')
    nacionalidad = models.CharField(max_length=50, default='Boliviana', db_column='nacionalidad')

    class Meta:
        managed = False
        db_table = 'persona'
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'

    def __str__(self):
        return f"{self.nombres} {self.apellidos} (CI: {self.ci})"

    @property
    def nombreCompleto(self):
        return f"{self.nombres} {self.apellidos}"


class Rol(models.Model):
    idRol = models.AutoField(primary_key=True, db_column='idrol')
    nombreRol = models.CharField(max_length=60, unique=True, db_column='nombrerol')
    codigoRol = models.CharField(max_length=30, unique=True, db_column='codigorol')
    descripcion = models.TextField(null=True, blank=True, db_column='descripcion')

    class Meta:
        managed = False
        db_table = 'rol'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return f"{self.nombreRol} ({self.codigoRol})"


class Usuario(models.Model):
    idUsuario = models.AutoField(primary_key=True, db_column='idusuario')
    persona = models.OneToOneField(
        Persona, 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE, 
        db_column='idpersona',
        related_name='usuario'
    )
    username = models.CharField(max_length=50, unique=True, db_column='username')
    email = models.CharField(max_length=100, unique=True, db_column='email')
    passwordHash = models.CharField(max_length=255, db_column='passwordhash')
    estado = models.CharField(
        max_length=20, 
        default='Activo',
        choices=[('Activo', 'Activo'), ('Inactivo', 'Inactivo'), ('Bloqueado', 'Bloqueado')],
        db_column='estado'
    )
    fechaCreacion = models.DateTimeField(auto_now_add=True, db_column='fechacreacion')
    roles = models.ManyToManyField(
        Rol,
        through='UsuarioRol',
        related_name='usuarios'
    )

    class Meta:
        managed = False
        db_table = 'usuario'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.username} - {self.estado}"

    def check_password(self, raw_password: str) -> bool:
        """
        Valida la contraseña permitiendo hashes argon2id, pbkdf2 y texto plano.
        """
        if not self.passwordHash or not raw_password:
            return False
        # 1. Comprobación directa (texto plano precargado o de procedimiento)
        if self.passwordHash == raw_password:
            return True
        # 2. Comprobación nativa con argon2id si el hash inicia con $argon2
        if self.passwordHash.startswith('$argon2'):
            try:
                from argon2 import PasswordHasher
                ph = PasswordHasher()
                ph.verify(self.passwordHash, raw_password)
                return True
            except Exception:
                return False
        # 3. Comprobación con hasher de Django
        try:
            return check_password(raw_password, self.passwordHash)
        except Exception:
            return False

    def set_password(self, raw_password: str):
        if raw_password:
            self.passwordHash = make_password(raw_password)
        else:
            self.passwordHash = ''

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return self.estado == 'Activo'

    @property
    def is_staff(self):
        return self.roles.filter(codigoRol='ADMIN').exists()


class UsuarioRol(models.Model):
    usuario = models.ForeignKey(
        Usuario, 
        db_column='idusuario', 
        on_delete=models.CASCADE, 
        primary_key=True, 
        related_name='usuario_roles'
    )
    rol = models.ForeignKey(
        Rol, 
        db_column='idrol', 
        on_delete=models.CASCADE, 
        related_name='rol_usuarios'
    )
    fechaAsignacion = models.DateTimeField(auto_now_add=True, db_column='fechaasignacion')

    class Meta:
        managed = False
        db_table = 'usuariorol'
        unique_together = (('usuario', 'rol'),)
        verbose_name = 'Usuario Rol'
        verbose_name_plural = 'Usuarios Roles'

    def __str__(self):
        return f"{self.usuario.username} -> {self.rol.codigoRol}"


class PersonalSalud(models.Model):
    persona = models.OneToOneField(
        Persona, 
        primary_key=True, 
        on_delete=models.CASCADE, 
        db_column='idpersona',
        related_name='personal_salud'
    )
    cargo = models.CharField(max_length=80, db_column='cargo')
    registroProfesional = models.CharField(max_length=40, unique=True, db_column='registroprofesional')

    class Meta:
        managed = False
        db_table = 'personalsalud'
        verbose_name = 'Personal de Salud'
        verbose_name_plural = 'Personal de Salud'

    def __str__(self):
        return f"{self.persona.nombreCompleto} - {self.cargo} ({self.registroProfesional})"


class BitacoraAuditoria(models.Model):
    idAuditoria = models.AutoField(primary_key=True, db_column='idauditoria')
    usuario = models.ForeignKey(
        Usuario, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        db_column='idusuario',
        related_name='eventos_auditoria'
    )
    rolActivo = models.CharField(max_length=60, null=True, blank=True, db_column='rolactivo')
    accionRealizada = models.CharField(max_length=255, db_column='accionrealizada')
    tablaAfectada = models.CharField(max_length=60, db_column='tablaafectada')
    idRegistroAfectado = models.IntegerField(null=True, blank=True, db_column='idregistroafectado')
    fechaHora = models.DateTimeField(auto_now_add=True, db_column='fechahora')
    ipOrigen = models.CharField(max_length=45, null=True, blank=True, db_column='iporigen')

    class Meta:
        managed = False
        db_table = 'bitacoraauditoria'
        verbose_name = 'Bitácora de Auditoría'
        verbose_name_plural = 'Bitácoras de Auditoría'
        ordering = ['-fechaHora']

    def __str__(self):
        return f"[{self.fechaHora}] [{self.rolActivo or 'N/A'}] {self.accionRealizada} en {self.tablaAfectada} (#{self.idRegistroAfectado})"
