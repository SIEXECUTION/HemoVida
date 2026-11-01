"""CU06: registro atómico, conservando SP y set_password/check_password existentes."""

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Persona, Usuario, Rol, UsuarioRol
from .utils import registrar_auditoria


@transaction.atomic
def register_candidate(d):
    from apps.donantes.models import PosibleDonador

    if connection.vendor == "postgresql":
        with connection.cursor() as c:
            c.execute("SELECT pg_advisory_xact_lock(82006)")
    # Repetir validación dentro de la transacción evita carreras entre registros.
    if (
        Persona.objects.filter(ci__iexact=d["ci"]).exists()
        or Usuario.objects.filter(
            Q(username__iexact=d["username"]) | Q(email__iexact=d["email"])
        ).exists()
    ):
        raise ValidationError(
            "La identidad, usuario o correo ya existe. Inicia sesión o recupera tu cuenta."
        )
    role = Rol.objects.filter(codigoRol="POSIBLE_DONADOR").first()
    if role is None:
        raise ValidationError(
            "Falta el rol POSIBLE_DONADOR; requiere configuración administrativa."
        )
    if connection.vendor == "postgresql":
        with connection.cursor() as c:
            c.execute(
                "CALL sp_autoregistro_posible_donador(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                [
                    d["ci"],
                    d["nombres"],
                    d["apellidos"],
                    d["sexo"],
                    d["fechaNacimiento"],
                    d.get("direccion", ""),
                    d.get("celular", ""),
                    d.get("ocupacion", ""),
                    d["username"],
                    d["email"],
                    d["password"],
                ],
            )
        user = Usuario.objects.select_related("persona").get(username=d["username"])
        # Mismo mecanismo existente: el texto legado no queda confirmado en BD.
        if user.passwordHash == d["password"] or not user.passwordHash.startswith(
            ("pbkdf2_", "argon2", "bcrypt")
        ):
            user.set_password(d["password"])
            user.save(update_fields=["passwordHash"])
        return user
    if connection.vendor != "sqlite":
        raise ValidationError("El registro requiere PostgreSQL.")
    # Compatibilidad de las pruebas existentes; no es fallback de errores PostgreSQL.
    person = Persona.objects.create(
        **{
            k: d[k]
            for k in (
                "ci",
                "nombres",
                "apellidos",
                "sexo",
                "fechaNacimiento",
                "direccion",
                "celular",
                "ocupacion",
            )
            if k in d
        },
        nacionalidad="Boliviana",
    )
    user = Usuario(
        persona=person, username=d["username"], email=d["email"], estado="Activo"
    )
    user.set_password(d["password"])
    user.save()
    PosibleDonador.objects.create(
        persona=person,
        estadoAptitud="No Apto",
        tieneAnalisis=False,
        carnetProvisionalCodigo=f"HV-POST-{timezone.localdate().year}-{person.idPersona}",
    )
    UsuarioRol.objects.create(usuario=user, rol=role)
    registrar_auditoria(
        user,
        "Auto-registro de postulante web",
        "Usuario",
        id_registro=user.idUsuario,
        ip_origen="0.0.0.0",
        rol_activo="Posible Donador",
    )
    return user
