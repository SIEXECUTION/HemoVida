"""Borradores, búsquedas paginadas, cierres y atención presencial del ciclo 2."""

import json
from datetime import date
from django.db import connection
from django.utils import timezone
from psycopg2.extras import Json
from rest_framework.exceptions import ValidationError
from apps.clinica.services import (
    clinical_operation,
    one,
    rows,
    patient,
    audit,
    professional,
)
from . import services as ops

PAGE_SIZE = 50


def number(request, key):
    try:
        value = int(request.query_params.get(key, 1))
        if not 1 <= value <= 1000000:
            raise ValueError
        return value
    except (ValueError, TypeError):
        raise ValidationError("Página inválida.")


def parse_day(value):
    try:
        return date.fromisoformat(value) if value else None
    except (ValueError, TypeError):
        raise ValidationError("Fecha inválida.")


def decode(row):
    if row:
        for key in ("respuestas", "catalogo", "requisitos_registrados"):
            if isinstance(row.get(key), str):
                row[key] = json.loads(row[key])
    return row


def get_draft(c, request, pid):
    pid = ops.person_id(request, pid)
    c.execute("SELECT * FROM prefiltroborrador WHERE idpersona=%s", [pid])
    row = c.fetchone()
    return decode(dict(zip([x[0] for x in c.description], row))) if row else None


def catalog(request):
    with connection.cursor() as c:
        ops.ready(c)
        staff = request.auth["rolActivo"] in ops.STAFF
        q = "%" + request.query_params.get("q", "")[:80] + "%"
        page, people_page, slot_page = (
            number(request, key)
            for key in ("pagina", "pagina_personas", "pagina_turnos")
        )
        day = parse_day(request.query_params.get("fecha"))
        slot_day = parse_day(request.query_params.get("fecha_turnos"))
        state = request.query_params.get("estado", "")
        if state not in (
            "",
            "Programada",
            "Atendida",
            "Pendiente",
            "Cancelada",
            "Inasistencia",
        ):
            raise ValidationError("Estado inválido.")
        common = """FROM citadonacion a JOIN persona p USING(idpersona)
            LEFT JOIN posibledonador pd USING(idpersona) LEFT JOIN donante dd USING(idpersona)
            WHERE (%s OR a.idpersona=%s) AND (p.ci ILIKE %s OR p.nombres ILIKE %s OR p.apellidos ILIKE %s
             OR pd.carnetprovisionalcodigo ILIKE %s OR dd.carnetdigitalcodigo ILIKE %s)
            AND (%s::date IS NULL OR ((a.fechahoraprogramada AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date=%s)
            AND (%s='' OR a.estadocita=%s)"""
        values = [staff, request.user.persona_id, *[q] * 5, day, day, state, state]
        c.execute("SELECT count(*) " + common, values)
        count = c.fetchone()[0]
        appointments = rows(
            c,
            """SELECT a.*,p.ci,p.nombres,p.apellidos,
            (SELECT respuestas FROM prefiltrocita f WHERE f.idcita=a.idcita) AS respuestas,
            (SELECT catalogo FROM prefiltrocita f WHERE f.idcita=a.idcita) AS requisitos_registrados """
            + common
            + " ORDER BY a.fechahoraprogramada DESC,a.idcita DESC LIMIT %s OFFSET %s",
            [*values, PAGE_SIZE, (page - 1) * PAGE_SIZE],
        )
        people, people_total = [], 0
        if staff:
            where = """FROM persona p JOIN posibledonador pd USING(idpersona) LEFT JOIN donante dd USING(idpersona)
                WHERE p.ci ILIKE %s OR p.nombres ILIKE %s OR p.apellidos ILIKE %s
                OR pd.carnetprovisionalcodigo ILIKE %s OR dd.carnetdigitalcodigo ILIKE %s"""
            c.execute("SELECT count(*) " + where, [q] * 5)
            people_total = c.fetchone()[0]
            people = rows(
                c,
                "SELECT p.idpersona,p.ci,p.nombres,p.apellidos "
                + where
                + " ORDER BY p.idpersona DESC LIMIT %s OFFSET %s",
                [*[q] * 5, PAGE_SIZE, (people_page - 1) * PAGE_SIZE],
            )
        slot_where = """FROM agendaturno t WHERE habilitado AND inicio>now() AND inicio<=now()+interval '180 days'
            AND (%s::date IS NULL OR (inicio AT TIME ZONE 'America/La_Paz')::date=%s)
            AND NOT EXISTS(SELECT 1 FROM cierreagenda x WHERE x.fecha=(t.inicio AT TIME ZONE 'America/La_Paz')::date AND x.cerrado)
            AND (SELECT count(*) FROM citadonacion a WHERE a.idturno=t.idturno AND a.estadocita IN ('Programada','Atendida','Inasistencia'))<cupo"""
        c.execute("SELECT count(*) " + slot_where, [slot_day, slot_day])
        slot_total = c.fetchone()[0]
        slots = rows(
            c,
            "SELECT t.*,1 AS disponibles "
            + slot_where
            + " ORDER BY inicio LIMIT %s OFFSET %s",
            [slot_day, slot_day, PAGE_SIZE, (slot_page - 1) * PAGE_SIZE],
        )
        reqs, version = ops.requirements(c)
        closed = rows(
            c,
            "SELECT fecha,cerrado,motivo FROM cierreagenda WHERE fecha>=(now() AT TIME ZONE 'America/La_Paz')::date ORDER BY fecha LIMIT 181",
        )
        draft = get_draft(c, request, request.user.persona_id) if not staff else None
        programs = rows(
            c,
            "SELECT idprograma,idreceptor,fechacirugia FROM programacionautologa WHERE estado='Aprobada' AND fechacirugia>(now() AT TIME ZONE 'America/La_Paz')::date AND (%s OR idreceptor=%s) ORDER BY idprograma",
            [staff, request.user.persona_id],
        )
        return dict(
            requisitos=reqs,
            versioncatalogo=version,
            personas=people,
            citas=[decode(a) for a in appointments],
            turnos=[s for s in slots if ops.valid_slot(s)],
            zona="America/La_Paz",
            borrador=draft,
            paginacion=dict(pagina=page, total=count, tamano=PAGE_SIZE),
            personas_paginacion=dict(
                pagina=people_page, total=people_total, tamano=PAGE_SIZE
            ),
            turnos_paginacion=dict(
                pagina=slot_page, total=slot_total, tamano=PAGE_SIZE
            ),
            cierres=closed,
            programas=programs,
        )


def save_draft(request, d):
    pid = ops.person_id(request, d.get("idpersona"))
    with clinical_operation(request), connection.cursor() as c:
        ops.ready(c)
        patient(c, pid)
        if d.get("idprograma"):
            program = one(
                c,
                "SELECT idreceptor FROM programacionautologa WHERE idprograma=%s",
                [d["idprograma"]],
            )
            if program["idreceptor"] != pid:
                raise ValidationError(
                    "La programación no pertenece a la persona del borrador."
                )
        one(c, "SELECT idpersona FROM posibledonador WHERE idpersona=%s", [pid])
        c.execute("LOCK TABLE requisitodonacion IN SHARE MODE")
        reqs, version = ops.requirements(c)
        ids = [r["idrequisito"] for r in d["respuestas"]]
        if (
            d["versioncatalogo"] != version
            or len(ids) != len(set(ids))
            or set(ids) - {r["idrequisito"] for r in reqs}
        ):
            raise ValidationError(
                "El cuestionario cambió o contiene respuestas inválidas. Actualiza antes de guardar."
            )
        c.execute(
            """INSERT INTO prefiltroborrador(idpersona,idusuario,versioncatalogo,catalogo,respuestas,idturno,tipoatencion,idprograma)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(idpersona) DO UPDATE SET
            idusuario=excluded.idusuario,versioncatalogo=excluded.versioncatalogo,catalogo=excluded.catalogo,respuestas=excluded.respuestas,
            idturno=excluded.idturno,tipoatencion=excluded.tipoatencion,idprograma=excluded.idprograma,actualizado=now()""",
            [
                pid,
                request.user.idUsuario,
                version,
                Json(reqs),
                Json(d["respuestas"]),
                d.get("idturno"),
                d["tipoatencion"],
                d.get("idprograma"),
            ],
        )
        return dict(mensaje="Borrador guardado. No confirma una cita ni reserva cupo.")


def close_day(request, d):
    today = timezone.now().astimezone(ops.LA_PAZ).date()
    if d["fecha"] < today:
        raise ValidationError("No se cambia un cierre de agenda pasado.")
    with clinical_operation(request), connection.cursor() as c:
        ops.ready(c)
        r = one(
            c,
            """INSERT INTO cierreagenda(fecha,cerrado,motivo,idusuario) VALUES(%s,%s,%s,%s)
            ON CONFLICT(fecha) DO UPDATE SET cerrado=excluded.cerrado,motivo=excluded.motivo,
            idusuario=excluded.idusuario,actualizado=now() RETURNING *""",
            [d["fecha"], d["cerrado"], d["motivo"], request.user.idUsuario],
        )
        c.execute(
            "UPDATE agendaturno SET habilitado=%s WHERE (inicio AT TIME ZONE 'America/La_Paz')::date=%s AND inicio>now()",
            [not d["cerrado"], d["fecha"]],
        )
        cancelled = []
        if d["cerrado"]:
            c.execute(
                """UPDATE citadonacion SET estadocita='Cancelada' WHERE estadocita IN ('Programada','Pendiente')
                AND NOT asistenciaconfirmada AND fechahoraprogramada>=CURRENT_TIMESTAMP
                AND ((fechahoraprogramada AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date=%s RETURNING idcita""",
                [d["fecha"]],
            )
            cancelled = [x[0] for x in c.fetchall()]
            for ident in cancelled:
                audit(
                    c,
                    request,
                    "citadonacion",
                    ident,
                    "CU07 cierre de agenda: " + d["motivo"][:180],
                )
        return dict(
            r,
            citas_canceladas=cancelled,
            mensaje=f"Agenda actualizada. Citas canceladas: {len(cancelled)}. Reabrir no restaura citas canceladas.",
        )


def requirement(request, d, ident=None):
    with clinical_operation(request), connection.cursor() as c:
        ops.ready(c)
        if ident is None:
            r = one(
                c,
                "INSERT INTO requisitodonacion(nombrerequisito,tiporequisito,esexcluyentedefinitivo,activo) VALUES(%s,%s,%s,%s) RETURNING *",
                [
                    d["nombrerequisito"],
                    d["tiporequisito"],
                    d["esexcluyentedefinitivo"],
                    d["activo"],
                ],
            )
        else:
            one(
                c,
                "SELECT idrequisito FROM requisitodonacion WHERE idrequisito=%s FOR UPDATE",
                [ident],
            )
            r = one(
                c,
                "UPDATE requisitodonacion SET nombrerequisito=%s,tiporequisito=%s,esexcluyentedefinitivo=%s,activo=%s WHERE idrequisito=%s RETURNING *",
                [
                    d["nombrerequisito"],
                    d["tiporequisito"],
                    d["esexcluyentedefinitivo"],
                    d["activo"],
                    ident,
                ],
            )
        return r


def walk_in(request, d):
    # El slot se reserva dentro de la misma transacción que la admisión.
    with clinical_operation(request), connection.cursor() as c:
        ops.ready(c)
        professional(c, request)
        slot = one(c, "SELECT inicio FROM agendaturno WHERE idturno=%s", [d["idturno"]])
        if (
            slot["inicio"].astimezone(ops.LA_PAZ).date()
            != timezone.now().astimezone(ops.LA_PAZ).date()
        ):
            raise ValidationError(
                "La admisión presencial requiere un turno de hoy con cupo."
            )
        appointment = ops.create_appointment(request, d)
        from apps.clinica.services import admit

        admit(
            request,
            dict(idcita=appointment["idcita"], idpersona=appointment["idpersona"]),
        )
        audit(
            c,
            request,
            "citadonacion",
            appointment["idcita"],
            "CU08 ingreso presencial autorizado: " + d["motivo"][:160],
        )
        return dict(
            appointment,
            asistenciaconfirmada=True,
            mensaje="Admisión presencial confirmada; derivar a triaje, sin autorización de extracción.",
        )
