"""Calendario académico del centro, independiente de la zona de conexión/servidor."""

from rest_framework.exceptions import APIException

TODAY_SQL = "public.hemo_dia_clinico()"


def require_calendar(cursor):
    cursor.execute(
        "SELECT to_regprocedure('public.hemo_dia_clinico(timestamp with time zone)') IS NOT NULL AND to_regprocedure('public.hemo_fecha_clinica(timestamp without time zone)') IS NOT NULL"
    )
    if not cursor.fetchone()[0]:
        error = APIException(
            "Falta la migración 10 de calendario y cierre académico. No se guardó la operación."
        )
        error.status_code = 503
        raise error
