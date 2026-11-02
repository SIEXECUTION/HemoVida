"""Bloqueo progresivo diario; las escrituras sobreviven al error de credenciales."""

from datetime import timedelta, timezone as datetime_timezone
from zoneinfo import ZoneInfo
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Usuario


def authenticate_user(login, password):
    error = None
    now = timezone.now()
    day = now.astimezone(ZoneInfo("America/La_Paz")).date()
    with transaction.atomic():
        lookup = {"email__iexact": login} if "@" in login else {"username": login}
        try:
            user = Usuario.objects.select_for_update().get(**lookup)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError(
                {"detail": "Credenciales inválidas. Usuario no encontrado."}
            )
        # El esquema heredado guarda este timestamp sin zona, en UTC.
        if user.fechaBloqueoHasta and timezone.is_naive(user.fechaBloqueoHasta):
            user.fechaBloqueoHasta = user.fechaBloqueoHasta.replace(
                tzinfo=datetime_timezone.utc
            )
        if user.estado not in ("Activo", "Bloqueado Temporal"):
            error = f"Acceso denegado. La cuenta está en estado {user.estado}. Contacte al Administrador."
        else:
            if user.fechaIntentosDia != day:
                user.fechaIntentosDia = day
                user.intentosFallidos = 0
                user.fechaBloqueoHasta = None
                user.estado = "Activo"
            if user.estado == "Bloqueado Temporal":
                if user.fechaBloqueoHasta and now >= user.fechaBloqueoHasta:
                    user.estado = "Activo"
                    user.fechaBloqueoHasta = None
                else:
                    if user.fechaBloqueoHasta:
                        deadline = user.fechaBloqueoHasta.astimezone(
                            ZoneInfo("America/La_Paz")
                        ).strftime("%d/%m/%Y %H:%M")
                        error = f"Cuenta bloqueada temporalmente hasta {deadline} (hora de Bolivia)."
                    else:
                        error = "Bloqueo temporal sin fecha de vencimiento. Contacte al Administrador."
            if not error and not user.check_password(password):
                user.intentosFallidos += 1
                if user.intentosFallidos % 3 == 0:
                    # El contador se conserva durante el día, incluso tras un login correcto.
                    minutes = 15 * 2 ** min(user.intentosFallidos // 3 - 1, 7)
                    user.fechaBloqueoHasta = now + timedelta(minutes=minutes)
                    user.estado = "Bloqueado Temporal"
                    user.totalBloqueosRecibidos += 1
                    error = f"Has acumulado {user.intentosFallidos} intentos fallidos hoy. Bloqueo temporal de {minutes} minutos."
                else:
                    remaining = 3 - user.intentosFallidos % 3
                    error = f"Contraseña incorrecta. Quedan {remaining} intento(s) antes del siguiente bloqueo."
            user.save(
                update_fields=[
                    "fechaIntentosDia",
                    "intentosFallidos",
                    "fechaBloqueoHasta",
                    "estado",
                    "totalBloqueosRecibidos",
                ]
            )
        until = user.fechaBloqueoHasta
    # Fuera de atomic: no revertir los fallos cuando DRF devuelve el error.
    if error:
        detail = {"detail": error}
        if user.estado == "Bloqueado Temporal" and until:
            detail["bloqueadoHasta"] = until.isoformat()
        raise serializers.ValidationError(detail)
    return user
