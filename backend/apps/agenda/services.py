"""Agenda del centro: turnos explícitos, prefiltro declarativo y PostgreSQL."""

import hashlib
import json
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import connection
from django.utils import timezone
from psycopg2.extras import Json
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from apps.clinica.services import (
    clinical_operation,
    one,
    rows,
    patient,
    audit,
    professional,
)

STAFF = ["ADMIN", "PERS_COLECTA"]
DONORS = ["DONANTE", "POSIBLE_DONADOR", "RECEPTOR"]
LA_PAZ = ZoneInfo("America/La_Paz")


def ready(c):
    c.execute(
        "SELECT to_regclass('public.agendaturno'),to_regclass('public.prefiltrocita'),count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='citadonacion' AND column_name IN ('idturno','tipoatencion')"
    )
    t, p, columns = c.fetchone()
    c.execute(
        "SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.citadonacion'::regclass AND conname='citadonacion_estadocita_check' AND position('Pendiente' in pg_get_constraintdef(oid))>0)"
    )
    pending_state = c.fetchone()[0]
    if not t or not p or columns != 2 or not pending_state:
        e = APIException(
            "Falta aplicar la migración 08 de agenda y prefiltro. No se guardó la operación."
        )
        e.status_code = 503
        raise e
    from .autologous import ready09

    ready09(c)
    if connection.in_atomic_block:
        c.execute("SELECT pg_advisory_xact_lock(82007)")


def person_id(request, requested=None):
    own = request.user.persona_id
    if request.auth["rolActivo"] not in STAFF and requested not in (None, own):
        raise PermissionDenied("Solo puedes gestionar tus propias citas.")
    return requested or own


def requirements(c):
    from .autologous import ready09

    ready09(c)
    catalog = rows(
        c,
        "SELECT idrequisito,nombrerequisito,tiporequisito,esexcluyentedefinitivo FROM requisitodonacion WHERE activo ORDER BY idrequisito",
    )
    version = hashlib.sha256(
        json.dumps(catalog, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    return catalog, version


def slots(c):
    result = rows(
        c,
        """SELECT t.idturno,t.inicio,t.fin,t.cupo,
        greatest(0,t.cupo-count(a.idcita))::integer AS disponibles
        FROM agendaturno t LEFT JOIN citadonacion a ON a.idturno=t.idturno AND a.estadocita IN ('Programada','Atendida','Inasistencia')
        WHERE t.habilitado AND t.inicio>now() AND t.inicio<=now()+interval '180 days'
        GROUP BY t.idturno HAVING count(a.idcita)<t.cupo ORDER BY t.inicio LIMIT 500""",
    )
    return [slot for slot in result if valid_slot(slot)]


def catalog(request):
    from .adjustments import catalog as paged_catalog

    return paged_catalog(request)


def valid_slot(slot):
    start = slot["inicio"].astimezone(LA_PAZ)
    return (
        start.weekday() < 5
        and start.hour in (*range(8, 12), *range(13, 17))
        and start.minute % 15 == 0
        and start.second == start.microsecond == 0
        and slot["fin"] - slot["inicio"] == timedelta(minutes=15)
        and slot["cupo"] == 1
    )


def create_slot(request, d):
    now = timezone.now()
    today = now.astimezone(LA_PAZ).date()
    day = d["fecha"]
    if day.weekday() >= 5 or not today <= day <= today + timedelta(days=180):
        raise ValidationError(
            "Selecciona lunes a viernes entre hoy y los próximos 180 días."
        )
    with clinical_operation(request), connection.cursor() as c:
        ready(c)
        c.execute("SELECT 1 FROM cierreagenda WHERE fecha=%s AND cerrado", [day])
        if c.fetchone():
            raise ValidationError(
                "El día está cerrado. Reábrelo expresamente antes de publicar agenda."
            )
        # Publicación idempotente, sin horarios inventados ni solapamientos.
        c.execute("SELECT pg_advisory_xact_lock(82007)")
        created = 0
        for hour in (*range(8, 12), *range(13, 17)):
            for minute in (0, 15, 30, 45):
                start = datetime.combine(day, time(hour, minute), tzinfo=LA_PAZ)
                end = start + timedelta(minutes=15)
                if start <= now:
                    continue
                overlapping = rows(
                    c,
                    "SELECT * FROM agendaturno WHERE inicio<%s AND fin>%s FOR UPDATE",
                    [end, start],
                )
                if overlapping:
                    if (
                        len(overlapping) != 1
                        or overlapping[0]["inicio"] != start
                        or not valid_slot(overlapping[0])
                        or not overlapping[0]["habilitado"]
                    ):
                        raise ValidationError(
                            "Hay un turno incompatible; requiere revisión de la agenda."
                        )
                    continue
                c.execute(
                    "INSERT INTO agendaturno(inicio,fin,cupo,creadopor) VALUES(%s,%s,1,%s)",
                    [start, end, request.user.idUsuario],
                )
                created += 1
        return dict(
            fecha=day,
            turnos_creados=created,
            mensaje=f"Agenda publicada: {created} turnos nuevos de 15 minutos. Un cupo por turno.",
        )


def lock_slot(c, ident):
    slot = one(c, "SELECT * FROM agendaturno WHERE idturno=%s FOR UPDATE", [ident])
    if (
        not slot["habilitado"]
        or not valid_slot(slot)
        or slot["inicio"] <= timezone.now()
    ):
        raise ValidationError("El turno no está disponible.")
    c.execute(
        "SELECT 1 FROM cierreagenda WHERE fecha=(%s AT TIME ZONE 'America/La_Paz')::date AND cerrado",
        [slot["inicio"]],
    )
    if c.fetchone():
        raise ValidationError("El día de atención está cerrado.")
    c.execute(
        "SELECT count(*) FROM citadonacion WHERE idturno=%s AND estadocita IN ('Programada','Atendida','Inasistencia')",
        [ident],
    )
    if c.fetchone()[0] >= slot["cupo"]:
        raise ValidationError("No quedan cupos en este turno. Selecciona otro.")
    return slot


def eligibility(c, pid, slot, attention):
    p = one(c, "SELECT fechanacimiento,sexo FROM persona WHERE idpersona=%s", [pid])
    day = slot["inicio"].astimezone(LA_PAZ).date()
    # Mayoría de edad referida por el documento; no supone aptitud médica.
    born = p["fechanacimiento"]
    age = day.year - born.year - ((day.month, day.day) < (born.month, born.day))
    if age < 18:
        raise ValidationError(
            "La agenda ordinaria requiere mayoría de edad; consulta al profesional."
        )
    c.execute(
        """SELECT 1 FROM diferimiento WHERE idposibledonador=%s AND fechainiciodiferimiento<=%s
        AND (fechafindiferimiento IS NULL OR fechafindiferimiento>=%s)""",
        [pid, day, day],
    )
    if c.fetchone():
        raise ValidationError(
            "Existe un diferimiento para esa fecha. Consulta al profesional."
        )
    c.execute(
        "SELECT 1 FROM donante WHERE idpersona=%s AND estadohabilitacion='Diferido Definitivo'",
        [pid],
    )
    if c.fetchone():
        raise ValidationError(
            "Existe una suspensión definitiva; requiere revisión profesional."
        )
    if attention == "Donacion":
        c.execute(
            """SELECT 1 FROM extracciondonacion WHERE idpersonadonante=%s
            AND ((fechahora AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date+%s>%s""",
            [pid, 90 if p["sexo"] == "M" else 120, day],
        )
        if c.fetchone():
            raise ValidationError(
                "No se ha cumplido el descanso biológico para donar en esa fecha. Puedes solicitar evaluación."
            )


def create_appointment(request, d):
    pid = person_id(request, d.get("idpersona"))
    with clinical_operation(request), connection.cursor() as c:
        ready(c)
        patient(c, pid)
        one(c, "SELECT idpersona FROM posibledonador WHERE idpersona=%s", [pid])
        slot = lock_slot(c, d["idturno"])
        if request.auth["rolActivo"] == "RECEPTOR" and not d.get("idprograma"):
            raise PermissionDenied(
                "El perfil receptor agenda únicamente su programa autólogo."
            )
        if d["tipoatencion"] == "Autologa" or d.get("idprograma"):
            if not d.get("idprograma"):
                raise ValidationError("Selecciona una programación autóloga aprobada.")
            from .autologous import validate_program

            program = validate_program(c, d["idprograma"], pid)
            if slot["inicio"].astimezone(LA_PAZ).date() >= program["fechacirugia"]:
                raise ValidationError("La atención debe ser anterior a la cirugía.")
        eligibility(c, pid, slot, d["tipoatencion"])
        c.execute(
            "SELECT 1 FROM citadonacion WHERE idpersona=%s AND estadocita='Programada' AND fechahoraprogramada>=CURRENT_TIMESTAMP",
            [pid],
        )
        if c.fetchone():
            raise ValidationError(
                "Ya tienes una cita programada. Cancélala o reprográmala."
            )
        # Congela el catálogo durante la validación y conserva una copia histórica.
        c.execute("LOCK TABLE requisitodonacion IN SHARE MODE")
        reqs, version = requirements(c)
        if not reqs or version != d["versioncatalogo"]:
            raise ValidationError(
                "El cuestionario no está disponible o cambió. Actualiza la página."
            )
        answers = d["respuestas"]
        ids = [a["idrequisito"] for a in answers]
        if len(ids) != len(set(ids)) or set(ids) != {r["idrequisito"] for r in reqs}:
            raise ValidationError(
                "Responde una sola vez cada requisito del cuestionario vigente."
            )
        approved = all(a["cumple"] for a in answers)
        if d["tipoatencion"] == "Autologa" and not approved:
            raise ValidationError(
                "Los requisitos autólogos pendientes deben ser revisados antes de agendar colecta. Solicita evaluación."
            )
        # Evaluación permite revisión de respuestas pendientes; jamás autoriza colecta.
        state = (
            "Programada"
            if approved or d["tipoatencion"] == "Evaluacion"
            else "Pendiente"
        )
        appointment = one(
            c,
            """INSERT INTO citadonacion(idpersona,fechahoraprogramada,idturno,tipoatencion,prefiltroaprobado,estadocita)
            VALUES(%s,%s,%s,%s,%s,%s) RETURNING *""",
            [
                pid,
                slot["inicio"].astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                slot["idturno"],
                d["tipoatencion"],
                approved,
                state,
            ],
        )
        for answer in answers:
            c.execute(
                "INSERT INTO detallecitarequisito(idcita,idrequisito,cumplerequisito,observacionrespuesta) VALUES(%s,%s,%s,%s)",
                [
                    appointment["idcita"],
                    answer["idrequisito"],
                    answer["cumple"],
                    answer.get("observacion", ""),
                ],
            )
        if d.get("idprograma"):
            c.execute(
                "UPDATE citadonacion SET idprograma=%s WHERE idcita=%s",
                [d["idprograma"], appointment["idcita"]],
            )
            appointment["idprograma"] = d["idprograma"]
        c.execute("DELETE FROM prefiltroborrador WHERE idpersona=%s", [pid])
        c.execute(
            "INSERT INTO prefiltrocita(idcita,idusuario,versioncatalogo,catalogo,respuestas,aprobado) VALUES(%s,%s,%s,%s,%s,%s)",
            [
                appointment["idcita"],
                request.user.idUsuario,
                version,
                Json(reqs),
                Json(answers),
                approved,
            ],
        )
        audit(
            c,
            request,
            "citadonacion",
            appointment["idcita"],
            "CU06/CU07 cita de "
            + d["tipoatencion"]
            + "; estado="
            + state
            + "; prefiltro="
            + str(approved),
        )
        message = (
            "Cita confirmada. Requiere evaluación clínica; no autoriza extracción."
            if approved
            else (
                "Cita de evaluación confirmada. El prefiltro requiere revisión profesional; no autoriza extracción."
                if state == "Programada"
                else "Respuestas guardadas. La cita de donación no fue confirmada; solicita evaluación profesional."
            )
        )
        return dict(appointment, mensaje=message)


def change_appointment(request, ident, d, cancel=False):
    with clinical_operation(request), connection.cursor() as c:
        ready(c)
        # Persona primero, igual que admisión, triaje y diferimiento.
        a = one(c, "SELECT idpersona FROM citadonacion WHERE idcita=%s", [ident])
        pid = person_id(request, a["idpersona"])
        patient(c, pid)
        a = one(c, "SELECT * FROM citadonacion WHERE idcita=%s FOR UPDATE", [ident])
        now_utc = timezone.now().astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
        allowed_states = ["Programada", "Pendiente"] if cancel else ["Programada"]
        if (
            a["estadocita"] not in allowed_states
            or a["asistenciaconfirmada"]
            or a["fechahoraprogramada"] <= now_utc
        ):
            raise ValidationError(
                "Solo se modifica una cita futura programada sin asistencia confirmada."
            )
        if cancel:
            c.execute(
                "UPDATE citadonacion SET estadocita='Cancelada' WHERE idcita=%s",
                [ident],
            )
        else:
            if not a["idturno"]:
                raise ValidationError(
                    "Cita histórica sin turno: recepción debe revisarla."
                )
            if a["idturno"] == d["idturno"]:
                return a
            # Orden común de bloqueo para cambios cruzados de turno.
            c.execute(
                "SELECT idturno FROM agendaturno WHERE idturno=ANY(%s) ORDER BY idturno FOR UPDATE",
                [[a["idturno"], d["idturno"]]],
            )
            slot = lock_slot(c, d["idturno"])
            eligibility(c, pid, slot, a["tipoatencion"])
            if a.get("idprograma"):
                from .autologous import validate_program

                program = validate_program(c, a["idprograma"], pid)
                if slot["inicio"].astimezone(LA_PAZ).date() >= program["fechacirugia"]:
                    raise ValidationError("La atención debe ser anterior a la cirugía.")
            c.execute("LOCK TABLE requisitodonacion IN SHARE MODE")
            _, current = requirements(c)
            c.execute(
                "SELECT versioncatalogo FROM prefiltrocita WHERE idcita=%s", [ident]
            )
            snapshot = c.fetchone()
            if (
                not snapshot
                or snapshot[0] != current
                or (not a["prefiltroaprobado"] and a["tipoatencion"] != "Evaluacion")
            ):
                raise ValidationError(
                    "Cambió el prefiltro. Cancela y solicita una nueva cita con el cuestionario vigente."
                )
            c.execute(
                "UPDATE citadonacion SET idturno=%s,fechahoraprogramada=%s WHERE idcita=%s",
                [
                    slot["idturno"],
                    slot["inicio"].astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                    ident,
                ],
            )
        audit(
            c,
            request,
            "citadonacion",
            ident,
            "CU07 cita cancelada" if cancel else "CU07 cita reprogramada",
        )
        return one(c, "SELECT * FROM citadonacion WHERE idcita=%s", [ident])


def incentives(request, d=None):
    with clinical_operation(request), connection.cursor() as c:
        professional(c, request)
        if d is None:
            return rows(
                c,
                """SELECT e.idextraccion,e.fechahora,p.nombres,p.apellidos,
                i.idincentivo,i.tipoarticulo,i.refrigerioentregado,i.fechahoraentrega FROM extracciondonacion e
                JOIN persona p ON p.idpersona=e.idpersonadonante LEFT JOIN incentivoentrega i USING(idextraccion)
                ORDER BY e.fechahora DESC LIMIT 200""",
            )
        one(
            c,
            "SELECT idextraccion FROM extracciondonacion WHERE idextraccion=%s FOR UPDATE",
            [d["idextraccion"]],
        )
        c.execute(
            "SELECT 1 FROM incentivoentrega WHERE idextraccion=%s", [d["idextraccion"]]
        )
        if c.fetchone():
            raise ValidationError("La entrega ya está registrada para esta extracción.")
        r = one(
            c,
            "INSERT INTO incentivoentrega(idextraccion,tipoarticulo,refrigerioentregado) VALUES(%s,%s,%s) RETURNING *",
            [d["idextraccion"], d["tipoarticulo"], d["refrigerioentregado"]],
        )
        audit(
            c,
            request,
            "incentivoentrega",
            r["idincentivo"],
            "CU09 entrega registrada; refrigerio=" + str(d["refrigerioentregado"]),
        )
        return r


def confirm_refreshment(request, ident, d):
    with clinical_operation(request), connection.cursor() as c:
        professional(c, request)
        r = one(
            c, "SELECT * FROM incentivoentrega WHERE idincentivo=%s FOR UPDATE", [ident]
        )
        if not r["refrigerioentregado"]:
            c.execute(
                "UPDATE incentivoentrega SET refrigerioentregado=true,fechahoraentrega=CURRENT_TIMESTAMP WHERE idincentivo=%s",
                [ident],
            )
            audit(
                c,
                request,
                "incentivoentrega",
                ident,
                "CU09 refrigerio pendiente efectivamente entregado",
            )
        return one(c, "SELECT * FROM incentivoentrega WHERE idincentivo=%s", [ident])
