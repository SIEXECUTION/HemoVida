"""CU21: indicación médica y revisión de programación preoperatoria."""

import json
from django.db import connection
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied, APIException
from psycopg2.extras import Json
from .services import LA_PAZ
from apps.clinica.services import (
    clinical_operation,
    one,
    rows,
    patient,
    professional,
    audit,
)

MEDICAL = ["MED_SOLICITANTE", "DOC_TRIAJE"]
REVIEWERS = ["BIOQ_INTEGRAL"]
READERS = [
    "ADMIN",
    *MEDICAL,
    *REVIEWERS,
    "PERS_COLECTA",
    "DONANTE",
    "POSIBLE_DONADOR",
    "RECEPTOR",
]


def ready09(c):
    c.execute(
        "SELECT to_regclass('public.programacionautologa'),to_regclass('public.programacionautologahistorial'),to_regclass('public.prefiltroborrador'),to_regclass('public.cierreagenda'),EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='requisitodonacion' AND column_name='activo')"
    )
    if not all(c.fetchone()):
        e = APIException(
            "Falta aplicar la migración 09 de programación autóloga y ajustes del ciclo 2."
        )
        e.status_code = 503
        raise e


def today():
    return timezone.now().astimezone(LA_PAZ).date()


def snapshot(c, request, p):
    c.execute(
        "INSERT INTO programacionautologahistorial(idprograma,version,contenido,idusuario) VALUES(%s,%s,%s,%s)",
        [
            p["idprograma"],
            p["version"],
            Json(p, dumps=lambda v: json.dumps(v, default=str)),
            request.user.idUsuario,
        ],
    )


def history(request, ident):
    with connection.cursor() as c:
        ready09(c)
        p = one(
            c,
            "SELECT idreceptor FROM programacionautologa WHERE idprograma=%s",
            [ident],
        )
        if (
            request.auth["rolActivo"] in ["DONANTE", "POSIBLE_DONADOR", "RECEPTOR"]
            and p["idreceptor"] != request.user.persona_id
        ):
            raise PermissionDenied("Solo puedes consultar tu propia programación.")
        result = rows(
            c,
            "SELECT version,contenido,registrado,idusuario FROM programacionautologahistorial WHERE idprograma=%s ORDER BY version",
            [ident],
        )
        for item in result:
            if isinstance(item["contenido"], str):
                item["contenido"] = json.loads(item["contenido"])
        return result


def catalog(request):
    with connection.cursor() as c:
        ready09(c)
        own = request.auth["rolActivo"] in ["DONANTE", "POSIBLE_DONADOR", "RECEPTOR"]
        programs = rows(
            c,
            """SELECT a.*,p.ci,p.nombres,p.apellidos,
            (SELECT count(*) FROM colectaautologa x WHERE x.idprograma=a.idprograma) AS colectas
            FROM programacionautologa a JOIN persona p ON p.idpersona=a.idreceptor
            WHERE (%s OR a.idreceptor=%s) AND (p.ci ILIKE %s OR p.nombres ILIKE %s OR p.apellidos ILIKE %s)
            ORDER BY a.idprograma DESC LIMIT 100""",
            [
                not own,
                request.user.persona_id,
                *["%" + request.query_params.get("q", "")[:80] + "%"] * 3,
            ],
        )
        receivers = (
            []
            if own
            else rows(
                c,
                """SELECT p.idpersona,p.ci,p.nombres,p.apellidos FROM persona p
            JOIN receptor r USING(idpersona) WHERE p.ci ILIKE %s OR p.nombres ILIKE %s OR p.apellidos ILIKE %s
            ORDER BY p.idpersona DESC LIMIT 100""",
                ["%" + request.query_params.get("q", "")[:80] + "%"] * 3,
            )
        )
        return dict(programas=programs, receptores=receivers)


def validate_program(c, ident, pid, surgery=None, lock=True, allow_today=False):
    program = one(
        c,
        "SELECT * FROM programacionautologa WHERE idprograma=%s"
        + (" FOR UPDATE" if lock else ""),
        [ident],
    )
    if (
        program["idreceptor"] != pid
        or program["estado"] != "Aprobada"
        or program["fechacirugia"] < today()
        or (program["fechacirugia"] == today() and not allow_today)
        or surgery
        and surgery != program["fechacirugia"]
    ):
        raise ValidationError(
            "Requiere programación autóloga aprobada, del mismo paciente y con cirugía vigente concordante."
        )
    return program


def create(request, d):
    if d["fechacirugia"] <= today():
        raise ValidationError("La cirugía debe ser futura.")
    with clinical_operation(request), connection.cursor() as c:
        from .services import ready

        ready(c)
        staff = professional(c, request)
        patient(c, d["idreceptor"])
        one(c, "SELECT idpersona FROM receptor WHERE idpersona=%s", [d["idreceptor"]])
        c.execute(
            "SELECT 1 FROM programacionautologa WHERE idreceptor=%s AND estado NOT IN ('Cancelada','Cerrada')",
            [d["idreceptor"]],
        )
        if c.fetchone():
            raise ValidationError(
                "El paciente ya tiene una programación activa. Revísala antes de abrir otra."
            )
        # Registrar candidatura no crea una cuenta ni declara aptitud.
        c.execute(
            "INSERT INTO posibledonador(idpersona) VALUES(%s) ON CONFLICT(idpersona) DO NOTHING",
            [d["idreceptor"]],
        )
        r = one(
            c,
            "INSERT INTO programacionautologa(idreceptor,fechacirugia,indicacion,referenciamedica,idmedico) VALUES(%s,%s,%s,%s,%s) RETURNING *",
            [
                d["idreceptor"],
                d["fechacirugia"],
                d["indicacion"],
                d["referenciamedica"],
                staff,
            ],
        )
        audit(
            c,
            request,
            "programacionautologa",
            r["idprograma"],
            "CU21 indicación médica registrada; pendiente de revisión bioquímica",
        )
        snapshot(c, request, r)
        return r


def quarantine(c, request, program, allow_delivered=False):
    mothers = rows(
        c,
        "SELECT idunidadmadre FROM colectaautologa WHERE idprograma=%s ORDER BY idunidadmadre",
        [program["idprograma"]],
    )
    for mother in mothers:
        mid = mother["idunidadmadre"]
        one(
            c,
            "SELECT idunidadmadre FROM unidadsangretotal WHERE idunidadmadre=%s FOR UPDATE",
            [mid],
        )
        c.execute(
            """SELECT 1 FROM ejemplarbolsa b WHERE b.idunidadmadre=%s AND (b.estadobolsak='Despachada'
            OR EXISTS(SELECT 1 FROM detalledespacho d WHERE d.idejemplarbolsa=b.idejemplarbolsa))""",
            [mid],
        )
        if c.fetchone() and not allow_delivered:
            raise ValidationError(
                "Hay unidades entregadas. El cambio exige el circuito institucional de retiro/revisión clínica."
            )
        # Preserva Bajas y exclusividad; nunca convierte a stock general.
        c.execute(
            "UPDATE unidadsangretotal SET estadoliberacion='En Cuarentena' WHERE idunidadmadre=%s AND estadoliberacion<>'Rechazada'",
            [mid],
        )
        c.execute(
            """UPDATE reservasangre SET estadoreserva='Cancelada' WHERE estadoreserva='Activa'
            AND idejemplarbolsa IN (SELECT idejemplarbolsa FROM ejemplarbolsa WHERE idunidadmadre=%s) RETURNING idreserva""",
            [mid],
        )
        for (rid,) in c.fetchall():
            audit(
                c,
                request,
                "reservasangre",
                rid,
                "CU21 reserva cancelada por revisión de programación quirúrgica",
            )
        c.execute(
            "UPDATE ejemplarbolsa SET estadobolsak='En Cuarentena' WHERE idunidadmadre=%s AND estadobolsak NOT IN ('Baja','Despachada')",
            [mid],
        )


def update(request, ident, d):
    with clinical_operation(request), connection.cursor() as c:
        from .services import ready

        ready(c)
        professional(c, request)
        initial = one(
            c,
            "SELECT idreceptor FROM programacionautologa WHERE idprograma=%s",
            [ident],
        )
        patient(c, initial["idreceptor"])
        p = one(
            c,
            "SELECT * FROM programacionautologa WHERE idprograma=%s FOR UPDATE",
            [ident],
        )
        if p["version"] != d["version"] or p["estado"] in ["Cancelada", "Cerrada"]:
            raise ValidationError(
                "La programación cambió o está cerrada. Actualiza antes de continuar."
            )
        action = d["accion"]
        if action == "Modificar":
            if request.auth["rolActivo"] not in MEDICAL:
                raise PermissionDenied(
                    "La indicación y la fecha se modifican desde el perfil médico."
                )
            if d["fechacirugia"] <= today():
                raise ValidationError("La cirugía debe ser futura.")
            quarantine(c, request, p)
            c.execute(
                """UPDATE programacionautologa SET fechacirugia=%s,indicacion=%s,referenciamedica=%s,
                estado='RevisionRequerida',version=version+1,revisadopor=NULL,fecharevision=NULL,motivorevision=%s,actualizado=now()
                WHERE idprograma=%s""",
                [
                    d["fechacirugia"],
                    d["indicacion"],
                    d["referenciamedica"],
                    d["motivo"],
                    ident,
                ],
            )
        else:
            if request.auth["rolActivo"] not in REVIEWERS:
                raise PermissionDenied(
                    "La revisión/cancelación/cierre corresponde al bioquímico integral."
                )
            if action == "Aprobar":
                if p["fechacirugia"] <= today():
                    raise ValidationError("La cirugía debe seguir siendo futura.")
                c.execute(
                    """SELECT 1 FROM ejemplarbolsa b JOIN colectaautologa a USING(idunidadmadre)
                    WHERE a.idprograma=%s AND b.estadobolsak<>'Baja'
                    AND (b.fechacaducidad<%s OR NOT b.esexclusivoautologo)""",
                    [ident, p["fechacirugia"]],
                )
                if c.fetchone():
                    raise ValidationError(
                        "La conservación o exclusividad de las unidades no permite la nueva cirugía."
                    )
                state = "Aprobada"
                c.execute(
                    "UPDATE colectaautologa SET fechacirugia=%s WHERE idprograma=%s",
                    [p["fechacirugia"], ident],
                )
            elif action == "Cancelar":
                quarantine(c, request, p)
                state = "Cancelada"
            else:
                if p["fechacirugia"] > today():
                    raise ValidationError(
                        "El cierre se registra desde la fecha de cirugía; antes corresponde cancelar."
                    )
                quarantine(c, request, p, allow_delivered=True)
                state = "Cerrada"
            c.execute(
                "UPDATE programacionautologa SET estado=%s,version=version+1,revisadopor=%s,fecharevision=now(),motivorevision=%s,actualizado=now() WHERE idprograma=%s",
                [state, request.user.persona_id, d["motivo"], ident],
            )
        # Cambios clínicos invalidan turnos anteriores; no se reactivan automáticamente.
        if action != "Aprobar":
            c.execute(
                "UPDATE citadonacion SET estadocita='Cancelada' WHERE idprograma=%s AND estadocita IN ('Programada','Pendiente') AND NOT asistenciaconfirmada RETURNING idcita",
                [ident],
            )
            for (aid,) in c.fetchall():
                audit(
                    c,
                    request,
                    "citadonacion",
                    aid,
                    "CU21 cita cancelada por cambio de programación",
                )
        audit(
            c,
            request,
            "programacionautologa",
            ident,
            "CU21 " + action + ": " + d["motivo"][:150],
        )
        result = one(
            c, "SELECT * FROM programacionautologa WHERE idprograma=%s", [ident]
        )
        snapshot(c, request, result)
        return result
