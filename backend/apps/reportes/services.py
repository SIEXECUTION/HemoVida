from datetime import date, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.db import connection
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.clinica.services import rows

CATALOG = {
    "extracciones": {
        "date": "fechahora",
        "dims": {
            "dia": "fechahora::date::text",
            "mes": "to_char(fechahora,'YYYY-MM')",
            "brazo": "brazoextraccion",
        },
        "filters": {},
        "unit": "ml",
    },
    "triajes": {
        "date": "fechahora",
        "dims": {
            "dia": "fechahora::date::text",
            "mes": "to_char(fechahora,'YYYY-MM')",
            "estado": "resultadoaptitud",
        },
        "filters": {"estado": "resultadoaptitud"},
        "unit": "evaluaciones",
    },
    "citas": {
        "date": "fechahoraprogramada",
        "dims": {
            "dia": "fechahoraprogramada::date::text",
            "mes": "to_char(fechahoraprogramada,'YYYY-MM')",
            "estado": "estadocita",
        },
        "filters": {"estado": "estadocita"},
        "unit": "citas",
    },
    "serologia": {
        "date": "fechaanalisis",
        "dims": {
            "dia": "fechaanalisis::date::text",
            "mes": "to_char(fechaanalisis,'YYYY-MM')",
            "estado": "dictamenfinal",
        },
        "filters": {"estado": "dictamenfinal"},
        "unit": "bolsas",
    },
    "stock": {
        "date": None,
        "dims": {
            "componente": "tipocomponente",
            "grupo": "grupoabo||' '||factorrh",
            "categoria": "categoriaetaria",
        },
        "filters": {
            "componente": "tipocomponente",
            "grupo": "idgrupo",
            "categoria": "categoriaetaria",
        },
        "unit": "ml",
    },
    "bajas": {
        "date": "fechahorabaja",
        "dims": {
            "dia": "fechahorabaja::date::text",
            "mes": "to_char(fechahorabaja,'YYYY-MM')",
            "motivo": "motivobaja",
            "origen": "CASE WHEN idunidadmadre IS NULL THEN 'Componente' ELSE 'Madre' END",
        },
        "filters": {},
        "unit": "eventos de baja",
    },
    "recaudacion": {
        "date": "fechahorapago",
        "dims": {
            "dia": "fechahorapago::date::text",
            "mes": "to_char(fechahorapago,'YYYY-MM')",
            "metodo": "metodopago",
            "proveedor": "coalesce(proveedorpasarela,'Sin proveedor')",
        },
        "filters": {"metodo": "metodopago", "proveedor": "proveedorpasarela"},
        "unit": "BOB",
    },
    "cartera": {
        "date": None,
        "dims": {
            "estado": "estado_actual",
            "institucion": "idinstitucion::text",
            "prioridad": "prioridadsolicitud",
        },
        "filters": {
            "estado": "estado_actual",
            "institucion": "idinstitucion",
            "prioridad": "prioridadsolicitud",
        },
        "unit": "BOB",
    },
}

CATALOG["intentos"] = {
    "date": "fechacreacion",
    "dims": {
        "dia": "fechacreacion::date::text",
        "mes": "to_char(fechacreacion,'YYYY-MM')",
        "metodo": "metodopago",
        "proveedor": "coalesce(proveedorpasarela,'Sin proveedor')",
    },
    "filters": {"metodo": "metodopago", "proveedor": "proveedorpasarela"},
    "unit": "intentos",
}
# Las columnas heredadas sin zona se escriben con CURRENT_TIMESTAMP en la
# conexión UTC de Django; las financieras usan timestamptz. Normalizar ambas
# antes de filtrar o agrupar por el día institucional.
REPORT_TIME_ZONE = "America/La_Paz"
TODAY_SQL = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date"
for source, config in CATALOG.items():
    column = config["date"]
    if not column:
        continue
    utc = (
        column
        if source in ["recaudacion", "intentos"]
        else f"({column} AT TIME ZONE 'UTC')"
    )
    local = f"({utc} AT TIME ZONE 'America/La_Paz')"
    config["date"] = local
    if "dia" in config["dims"]:
        config["dims"]["dia"] = f"{local}::date::text"
    if "mes" in config["dims"]:
        config["dims"]["mes"] = f"to_char({local},'YYYY-MM')"

METRICS = {
    "extracciones": ["cantidad", "volumen"],
    "triajes": [
        "cantidad",
        "aptos",
        "rechazados",
        "porcentaje_aptitud",
        "porcentaje_diferimiento",
    ],
    "citas": [
        "cantidad",
        "canceladas",
        "pendientes",
        "programadas",
        "asistencias",
        "porcentaje_asistencia",
    ],
    "serologia": [
        "cantidad",
        "reactivas",
        "indeterminadas",
        "concluidas",
        "porcentaje_reactividad",
    ],
    "stock": ["cantidad", "volumen", "vencimiento_proximo"],
    "bajas": ["cantidad", "madres", "componentes"],
    "recaudacion": ["cantidad", "importe"],
    "cartera": ["cantidad", "importe", "cartera_vencida"],
    "intentos": ["cantidad", "finalizados", "confirmados", "porcentaje_confirmacion"],
}


def query(params):
    kind = params.get("fuente", "extracciones")
    config = CATALOG.get(kind)
    if not config:
        raise ValidationError("Consulta fuera del catálogo.")
    allowed = {
        "fuente",
        "dimension",
        "desde",
        "hasta",
        "formato",
        "horizonte",
        *config["filters"],
    }
    if set(params) - allowed:
        raise ValidationError("Filtro incompatible con la consulta.")
    dim = params.get("dimension") or next(iter(config["dims"]))
    if dim not in config["dims"]:
        raise ValidationError("Dimensión no permitida.")
    today = timezone.localdate(timezone=ZoneInfo(REPORT_TIME_ZONE))
    try:
        start = date.fromisoformat(
            params.get("desde")
            or (today - timedelta(days=30)).isoformat()
        )
        end = date.fromisoformat(
            params.get("hasta") or today.isoformat()
        )
        horizon = int(params.get("horizonte", 7))
    except (ValueError, TypeError):
        raise ValidationError("Fechas u horizonte inválidos.")
    if start > end or (end - start).days > 3660 or not 0 <= horizon <= 365:
        raise ValidationError("Período u horizonte fuera del rango permitido.")
    if not config["date"] and (params.get("desde") or params.get("hasta")):
        raise ValidationError(
            "Stock y cartera son fotografías actuales; no admiten un período histórico."
        )
    conditions = []
    values = []
    if config["date"]:
        conditions.append(config["date"] + "::date BETWEEN %s AND %s")
        values.extend([start, end])
    for key, column in config["filters"].items():
        if params.get(key):
            value = params[key]
            if key in ["grupo", "institucion"]:
                try:
                    value = int(value)
                    if value < 1:
                        raise ValueError
                except (TypeError, ValueError):
                    raise ValidationError("Identificador de filtro inválido.")
            conditions.append(column + "=%s")
            values.append(value)
    if kind == "extracciones":
        base = "SELECT * FROM extracciondonacion"
        metrics = "count(*) AS cantidad,coalesce(sum(volumenextraidoml),0) AS volumen"
    elif kind == "triajes":
        base = "SELECT * FROM triajeclinico"
        metrics = "count(*) AS cantidad,count(*) FILTER(WHERE resultadoaptitud='Apto') AS aptos,count(*) FILTER(WHERE resultadoaptitud='Rechazado') AS rechazados"
    elif kind == "citas":
        base = "SELECT * FROM citadonacion"
        metrics = "count(*) AS cantidad,count(*) FILTER(WHERE estadocita='Cancelada') AS canceladas,count(*) FILTER(WHERE estadocita='Pendiente') AS pendientes,count(*) FILTER(WHERE estadocita IN ('Programada','Atendida','Inasistencia')) AS programadas,count(*) FILTER(WHERE asistenciaconfirmada AND estadocita IN ('Programada','Atendida','Inasistencia')) AS asistencias"
    elif kind == "serologia":
        # Un lote cuenta una sola vez: último análisis hasta la fecha de corte.
        base = f"SELECT DISTINCT ON(idunidadmadre) * FROM analisisinmunoserologico WHERE {config['date']}::date<=%s ORDER BY idunidadmadre,fechaanalisis DESC,idanalisis DESC"
        markers = "ARRAY[resultadovih,resultadochagas,resultadohepatitisb,resultadohepatitisc,resultadosifilis,resultadohtlv]"
        metrics = f"count(*) AS cantidad,count(*) FILTER(WHERE 'Reactivo'=ANY({markers}) AND NOT ('Indeterminado'=ANY({markers}))) AS reactivas,count(*) FILTER(WHERE 'Indeterminado'=ANY({markers})) AS indeterminadas,count(*) FILTER(WHERE NOT ('Indeterminado'=ANY({markers}))) AS concluidas"
        values.insert(0, end)
    elif kind == "stock":
        base = f"SELECT e.*,g.grupoabo,g.factorrh FROM ejemplarbolsa e JOIN gruposanguineo g USING(idgrupo) WHERE estadobolsak='Disponible' AND fechacaducidad>={TODAY_SQL} AND NOT esexclusivoautologo"
        metrics = f"count(*) AS cantidad,coalesce(sum(volumenml),0) AS volumen,count(*) FILTER(WHERE fechacaducidad<={TODAY_SQL}+%s) AS vencimiento_proximo"
        # Horizonte es parte de la selección agregada, después de parámetros de base.
        values.insert(0, horizon)
    elif kind == "bajas":
        base = "SELECT * FROM bajainventario"
        metrics = "count(*) AS cantidad,count(*) FILTER(WHERE idunidadmadre IS NOT NULL) AS madres,count(*) FILTER(WHERE idejemplarbolsa IS NOT NULL) AS componentes"
    elif kind == "recaudacion":
        base = "SELECT p.* FROM pagofinanciero p JOIN deudafinanciera d USING(iddeuda) WHERE p.estadotransaccion='Confirmada' AND d.moneda='BOB'"
        metrics = "count(*) AS cantidad,coalesce(sum(montopagado),0) AS importe"
    elif kind == "intentos":
        base = "SELECT p.* FROM pagofinanciero p JOIN deudafinanciera d USING(iddeuda) WHERE d.moneda='BOB'"
        metrics = "count(*) AS cantidad,count(*) FILTER(WHERE estadotransaccion IN ('Confirmada','Rechazada','Anulada')) AS finalizados,count(*) FILTER(WHERE estadotransaccion='Confirmada') AS confirmados"
    else:
        base = "SELECT v.*,d.moneda FROM vw_cu22_cuentas_por_cobrar v JOIN deudafinanciera d USING(iddeuda) WHERE d.moneda='BOB'"
        metrics = "count(*) AS cantidad,coalesce(sum(saldopendiente),0) AS importe,coalesce(sum(saldopendiente) FILTER(WHERE estado_actual='Vencida'),0) AS cartera_vencida"
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"WITH base AS ({base}) SELECT {config['dims'][dim]} AS dimension,{metrics} FROM base{where} GROUP BY 1 ORDER BY 1 LIMIT 5001"
    with connection.cursor() as c:
        data = rows(c, sql, values)
        if len(data) > 5000:
            raise ValidationError(
                "Resultado demasiado grande. Reduce el período o los filtros."
            )
        for row in data:
            if kind == "triajes":
                row["porcentaje_aptitud"] = ratio(row["aptos"], row["cantidad"])
                row["porcentaje_diferimiento"] = ratio(
                    row["rechazados"], row["cantidad"]
                )
            elif kind == "citas":
                row["porcentaje_asistencia"] = ratio(
                    row["asistencias"], row["programadas"]
                )
            elif kind == "serologia":
                row["porcentaje_reactividad"] = ratio(
                    row["reactivas"], row["concluidas"]
                )
            elif kind == "intentos":
                row["porcentaje_confirmacion"] = ratio(
                    row["confirmados"], row["finalizados"]
                )
        totals = {
            k: sum((r.get(k, 0) for r in data), 0)
            for k in METRICS[kind]
            if k != "dimension" and not k.startswith("porcentaje")
        }
        if kind == "triajes":
            totals["porcentaje_aptitud"] = ratio(
                totals.get("aptos", 0), totals["cantidad"]
            )
            totals["porcentaje_diferimiento"] = ratio(
                totals["rechazados"], totals["cantidad"]
            )
        elif kind == "citas":
            totals["porcentaje_asistencia"] = ratio(
                totals.get("asistencias", 0), totals.get("programadas", 0)
            )
        elif kind == "serologia":
            totals["porcentaje_reactividad"] = ratio(
                totals.get("reactivas", 0), totals.get("concluidas", 0)
            )
        elif kind == "intentos":
            totals["porcentaje_confirmacion"] = ratio(
                totals["confirmados"], totals["finalizados"]
            )
        if kind in ["recaudacion", "cartera", "intentos"]:
            c.execute("SELECT count(*) FROM deudafinanciera WHERE moneda IS NULL")
            totals["deudas_sin_moneda_excluidas"] = c.fetchone()[0]
    return {
        "fuente": kind,
        "dimension": dim,
        "unidad": config["unit"],
        "desde": start if config["date"] else None,
        "hasta": end if config["date"] else None,
        "filtros": {k: params.get(k) for k in params},
        "actualizado": timezone.now(),
        "totales": totals,
        "filas": data,
        "criterios": {
            "zona_horaria": "Fechas y agrupaciones en America/La_Paz; columnas heredadas sin zona interpretadas como UTC, igual que las nuevas escrituras del backend.",
            "diferimiento": "Evaluaciones con dictamen Rechazado / evaluaciones del mismo período y filtros; no cuenta filas de diferimiento. El total se calcula con los conteos, sin promediar porcentajes de grupos.",
            "canceladas": "Canceladas y solicitudes pendientes excluidas del denominador de asistencia; pendientes no reservan cupo.",
            "stock": "Actual, disponible, no caducado y no autólogo",
            "serologia": "Último análisis por madre hasta la fecha final; indeterminados separados",
            "finanzas": "Solo BOB; pagos confirmados, sin sumar comprobantes",
        },
    }


def ratio(n, d):
    return round(Decimal(n) * 100 / Decimal(d), 2) if d else None
