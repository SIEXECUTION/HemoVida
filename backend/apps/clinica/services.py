"""Operaciones clínicas sobre el esquema existente. Sin escrituras fuera de atomic."""

from contextlib import contextmanager
from uuid import uuid4
from django.db import connection
from rest_framework.exceptions import ValidationError, NotFound, APIException
from apps.laboratorio.services import operacion_auditada, bloquear_madre


class MigrationRequired(APIException):
    status_code = 503
    default_detail = (
        "Falta la migración 06 de liberación y auditoría. No se guardó la operación."
    )


@contextmanager
def clinical_operation(request):
    with operacion_auditada(request):
        with connection.cursor() as c:
            c.execute(
                "SELECT to_regprocedure('public.hemo_lote_aprobado(integer)') IS NOT NULL AND EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE p.proname='hemo_auditar_cambio' AND t.tgenabled <> 'D')"
            )
            if not c.fetchone()[0]:
                raise MigrationRequired()
        yield


def one(c, sql, params=()):
    c.execute(sql, params)
    r = c.fetchone()
    if r is None:
        raise NotFound("Registro inexistente.")
    return dict(zip([x[0] for x in c.description], r))


def rows(c, sql, params=()):
    c.execute(sql, params)
    return [dict(zip([x[0] for x in c.description], r)) for r in c.fetchall()]


def audit(c, request, table, pk, action):
    c.execute(
        "INSERT INTO bitacoraauditoria(idusuario,rolactivo,accionrealizada,tablaafectada,idregistroafectado,iporigen) VALUES(%s,%s,%s,%s,%s,%s)",
        [
            request.user.idUsuario,
            request.auth["rolActivo"],
            action,
            table,
            pk,
            request.META.get("REMOTE_ADDR", "")[:45],
        ],
    )


def professional(c, request):
    one(
        c,
        "SELECT idpersona FROM personalsalud WHERE idpersona=%s",
        [request.user.persona_id],
    )
    return request.user.persona_id


def patient(c, pid):
    return one(
        c, "SELECT idpersona,sexo FROM persona WHERE idpersona=%s FOR UPDATE", [pid]
    )


def restrictions(c, pid):
    c.execute(
        "SELECT 1 FROM diferimiento WHERE idposibledonador=%s AND fechainiciodiferimiento<=CURRENT_DATE AND (fechafindiferimiento IS NULL OR fechafindiferimiento>=CURRENT_DATE)",
        [pid],
    )
    if c.fetchone():
        raise ValidationError(
            "Existe un diferimiento vigente; requiere revisión antes de continuar."
        )
    c.execute(
        "SELECT 1 FROM donante WHERE idpersona=%s AND estadohabilitacion='Diferido Definitivo'",
        [pid],
    )
    if c.fetchone():
        raise ValidationError("Existe una suspensión definitiva.")


def triage(request, d):
    with clinical_operation(request), connection.cursor() as c:
        staff = professional(c, request)
        patient(c, d["idpersona"])
        restrictions(c, d["idpersona"])
        one(
            c,
            "SELECT idpersona FROM posibledonador WHERE idpersona=%s",
            [d["idpersona"]],
        )
        ap = one(
            c, "SELECT * FROM citadonacion WHERE idcita=%s FOR UPDATE", [d["idcita"]]
        )
        if (
            ap["idpersona"] != d["idpersona"]
            or not ap["asistenciaconfirmada"]
            or ap["estadocita"] not in ["Programada", "Atendida"]
        ):
            raise ValidationError("Se requiere cita admitida de la misma persona.")
        c.execute(
            "SELECT 1 FROM triajeclinico WHERE idposibledonador=%s AND fechahora::date=CURRENT_DATE",
            [d["idpersona"]],
        )
        if c.fetchone():
            raise ValidationError(
                "Ya existe triaje de hoy. Requiere revisión del expediente."
            )
        keys = [
            "pesokg",
            "presionsistolicammhg",
            "presiondiastolicammhg",
            "nivelhemoglobina",
            "temperatura",
            "resultadoaptitud",
        ]
        r = one(
            c,
            "INSERT INTO triajeclinico(idposibledonador,idpersonalsalud,"
            + ",".join(keys)
            + ") VALUES("
            + ",".join(["%s"] * 8)
            + ") RETURNING *",
            [d["idpersona"], staff, *[d[k] for k in keys]],
        )
        c.execute(
            "UPDATE posibledonador SET estadoaptitud=%s WHERE idpersona=%s",
            ["Apto" if d["resultadoaptitud"] == "Apto" else "No Apto", d["idpersona"]],
        )
        if d["resultadoaptitud"] == "Apto":
            c.execute(
                "UPDATE donante SET estadohabilitacion='Apto' WHERE idpersona=%s AND estadohabilitacion='Diferido Temporal'",
                [d["idpersona"]],
            )
        c.execute(
            "UPDATE citadonacion SET estadocita='Atendida' WHERE idcita=%s",
            [d["idcita"]],
        )
        audit(
            c,
            request,
            "triajeclinico",
            r["idtriaje"],
            "CU10 dictamen profesional " + d["resultadoaptitud"],
        )
        return r


def defer(request, d):
    with clinical_operation(request), connection.cursor() as c:
        professional(c, request)
        patient(c, d["idpersona"])
        t = one(
            c,
            "SELECT * FROM triajeclinico WHERE idtriaje=%s FOR UPDATE",
            [d["idtriaje"]],
        )
        if t["idposibledonador"] != d["idpersona"]:
            raise ValidationError("Triaje de otra persona.")
        restrictions(c, d["idpersona"])
        r = one(
            c,
            "INSERT INTO diferimiento(idtriaje,idposibledonador,motivodetallado,diasinhabilitacion,fechainiciodiferimiento,fechafindiferimiento) VALUES(%s,%s,%s,%s,CURRENT_DATE,CASE WHEN %s='Temporal' THEN CURRENT_DATE+%s ELSE NULL END) RETURNING *",
            [
                d["idtriaje"],
                d["idpersona"],
                d["motivodetallado"],
                d["diasinhabilitacion"],
                d["tipo"],
                d["diasinhabilitacion"],
            ],
        )
        c.execute(
            "UPDATE posibledonador SET estadoaptitud='No Apto' WHERE idpersona=%s",
            [d["idpersona"]],
        )
        c.execute(
            "UPDATE donante SET estadohabilitacion=%s WHERE idpersona=%s",
            ["Diferido " + d["tipo"], d["idpersona"]],
        )
        c.execute(
            "UPDATE citadonacion SET estadocita='Cancelada' WHERE idpersona=%s AND estadocita='Programada' AND fechahoraprogramada>=CURRENT_TIMESTAMP AND (%s::date IS NULL OR fechahoraprogramada::date<=%s::date) RETURNING idcita",
            [d["idpersona"], r["fechafindiferimiento"], r["fechafindiferimiento"]],
        )
        ids = [x[0] for x in c.fetchall()]
        for pk in ids:
            audit(
                c, request, "citadonacion", pk, "CU11 cita cancelada por diferimiento"
            )
        audit(
            c,
            request,
            "diferimiento",
            r["iddiferimiento"],
            "CU11 "
            + d["tipo"]
            + "; requiere comunicación al candidato por el profesional",
        )
        return dict(r, citas_canceladas=ids)


def collect(request, d):
    with clinical_operation(request), connection.cursor() as c:
        staff = professional(c, request)
        # Persona primero: mismo orden de bloqueo que triaje y diferimiento.
        t = one(c, "SELECT * FROM triajeclinico WHERE idtriaje=%s", [d["idtriaje"]])
        p = patient(c, t["idposibledonador"])
        restrictions(c, p["idpersona"])
        latest = one(
            c,
            "SELECT idtriaje,resultadoaptitud,fechahora::date=CURRENT_DATE AS hoy FROM triajeclinico WHERE idposibledonador=%s ORDER BY fechahora DESC,idtriaje DESC LIMIT 1 FOR UPDATE",
            [p["idpersona"]],
        )
        if (
            latest["idtriaje"] != d["idtriaje"]
            or latest["resultadoaptitud"] != "Apto"
            or not latest["hoy"]
        ):
            raise ValidationError(
                "Se requiere el último triaje apto de hoy de la misma persona."
            )
        c.execute("SELECT 1 FROM extracciondonacion WHERE idtriaje=%s", [d["idtriaje"]])
        if c.fetchone():
            raise ValidationError("El triaje ya tiene una extracción.")
        c.execute(
            "SELECT 1 FROM extracciondonacion WHERE idpersonadonante=%s AND fechahora::date + %s > CURRENT_DATE",
            [p["idpersona"], 90 if p["sexo"] == "M" else 120],
        )
        if c.fetchone():
            raise ValidationError("No se ha cumplido el descanso biológico.")
        one(c, "SELECT idgrupo FROM gruposanguineo WHERE idgrupo=%s", [d["idgrupo"]])
        # La aceptación fue validada antes de escribir la extracción.
        ext = one(
            c,
            "INSERT INTO extracciondonacion(idpersonadonante,idpersonalsalud,codigoextraccion,volumenextraidoml,brazoextraccion,idtriaje) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *",
            [
                p["idpersona"],
                staff,
                "EXT-" + uuid4().hex[:26],
                d["volumenextraidoml"],
                d["brazoextraccion"],
                d["idtriaje"],
            ],
        )
        one(
            c,
            "INSERT INTO consentimientoinformado(idextraccion,declaracionjuradaaceptada,firmadigital) VALUES(%s,true,%s) RETURNING idconsentimiento",
            [ext["idextraccion"], d["firmadigital"]],
        )
        m = one(
            c,
            "INSERT INTO unidadsangretotal(idextraccion,idgrupo,codigobolsamadre,tipobolsa) VALUES(%s,%s,%s,'Bolsa Cuadruple CPD-SAGM') RETURNING *",
            [ext["idextraccion"], d["idgrupo"], "MAD-" + uuid4().hex],
        )
        c.execute(
            "UPDATE donante SET fechaultimadonacion=CURRENT_DATE WHERE idpersona=%s",
            [p["idpersona"]],
        )
        audit(
            c,
            request,
            "extracciondonacion",
            ext["idextraccion"],
            "CU15 colecta con triaje apto y consentimiento aceptado",
        )
        return dict(m, idtriaje=d["idtriaje"])


def lock_locations(c, ids):
    result = {}
    for pk in sorted(set(ids)):
        result[pk] = one(
            c, "SELECT * FROM ubicacionalmacen WHERE idubicacion=%s FOR UPDATE", [pk]
        )
    return result


def space(c, loc, additional=1):
    c.execute(
        "SELECT count(*) FROM ejemplarbolsa WHERE idubicacion=%s AND estadobolsak NOT IN ('Baja','Despachada')",
        [loc["idubicacion"]],
    )
    if c.fetchone()[0] + additional > loc["capacidadmaxima"]:
        raise ValidationError("Capacidad del almacén insuficiente.")


def fraction(request, madre, d):
    with clinical_operation(request), connection.cursor() as c:
        professional(c, request)
        bloquear_madre(c, madre)
        m = one(
            c,
            "SELECT m.*,e.fechahora,e.volumenextraidoml FROM unidadsangretotal m JOIN extracciondonacion e USING(idextraccion) WHERE idunidadmadre=%s",
            [madre],
        )
        c.execute(
            "SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' <= %s::timestamp + interval '8 hours'",
            [m["fechahora"]],
        )
        if not c.fetchone()[0] or m["estadoliberacion"] != "En Cuarentena":
            raise ValidationError(
                "Madre fuera del plazo o estado de fraccionamiento (8 horas)."
            )
        c.execute("SELECT 1 FROM ejemplarbolsa WHERE idunidadmadre=%s", [madre])
        if c.fetchone():
            raise ValidationError("La madre ya fue fraccionada.")
        # No inferir la exclusividad autóloga: hasta integrar CU21, impedir este flujo general.
        c.execute(
            "SELECT 1 FROM donante WHERE idpersona=(SELECT idpersonadonante FROM extracciondonacion WHERE idextraccion=%s) AND tipodonante='Autologo'",
            [m["idextraccion"]],
        )
        if c.fetchone():
            raise ValidationError(
                "Colecta autóloga: requiere el circuito de reserva exclusiva CU21."
            )
        parts = d["componentes"]
        if sum(p["volumenml"] for p in parts) > m["volumenextraidoml"]:
            raise ValidationError("Balance excede el volumen extraído.")
        locations = lock_locations(c, [p["idubicacion"] for p in parts])
        for pk, loc in locations.items():
            space(c, loc, sum(p["idubicacion"] == pk for p in parts))
        ids = []
        for p in parts:
            days = {
                "Concentrado de Globulos Rojos": 35,
                "Paquete Globular": 35,
                "Plasma Fresco Congelado": 365,
                "Concentrado Plaquetario": 5,
                "Crioprecipitado": 365,
            }[p["tipocomponente"]]
            category = p["categoriaetaria"]
            if category == "Pediátrico":
                c.execute(
                    "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='ejemplarbolsa'::regclass AND conname='chk_ejemplar_categoria_etaria'"
                )
                definition = c.fetchone()
                if definition and "Pedi\ufffdtrico" in definition[0]:
                    category = "Pedi\ufffdtrico"
            r = one(
                c,
                "INSERT INTO ejemplarbolsa(idunidadmadre,idgrupo,idubicacion,codigoejemplark,tipocomponente,volumenml,capacidadbolsaml,fechaextraccion,fechacaducidad,categoriaetaria) VALUES(%s,%s,%s,%s,%s,%s,%s,%s::date,%s::date+%s,%s) RETURNING idejemplarbolsa",
                [
                    madre,
                    m["idgrupo"],
                    p["idubicacion"],
                    "CMP-" + uuid4().hex,
                    p["tipocomponente"],
                    p["volumenml"],
                    p["capacidadbolsaml"],
                    m["fechahora"],
                    m["fechahora"],
                    days,
                    category,
                ],
            )
            ids.append(r["idejemplarbolsa"])
        for pk in locations:
            refresh_location(c, pk)
        return {"idunidadmadre": madre, "componentes": ids}


def custody(request, bolsa, d, baja=False):
    with clinical_operation(request), connection.cursor() as c:
        staff = professional(c, request)
        row = one(
            c,
            "SELECT idunidadmadre FROM ejemplarbolsa WHERE idejemplarbolsa=%s",
            [bolsa],
        )
        if row["idunidadmadre"]:
            bloquear_madre(c, row["idunidadmadre"])
        b = one(
            c,
            "SELECT * FROM ejemplarbolsa WHERE idejemplarbolsa=%s FOR UPDATE",
            [bolsa],
        )
        if (
            b["estadobolsak"] in ["Despachada", "Baja", "Reservada"]
            or b["esexclusivoautologo"]
        ):
            raise ValidationError(
                "Requiere circuito de despacho/reserva/autólogo o ya tiene baja."
            )
        locations = lock_locations(
            c, [x for x in [b["idubicacion"], d.get("idubicacion")] if x]
        )
        if baja:
            one(
                c,
                "INSERT INTO bajainventario(idejemplarbolsa,idpersonalsalud,motivobaja) VALUES(%s,%s,%s) RETURNING idbaja",
                [bolsa, staff, d["motivobaja"]],
            )
            c.execute(
                "UPDATE ejemplarbolsa SET estadobolsak='Baja' WHERE idejemplarbolsa=%s",
                [bolsa],
            )
        else:
            loc = lock_locations(c, [d["idubicacion"]])[d["idubicacion"]]
            if b["idubicacion"] != d["idubicacion"]:
                space(c, loc)
            c.execute(
                "UPDATE ejemplarbolsa SET idubicacion=%s WHERE idejemplarbolsa=%s",
                [d["idubicacion"], bolsa],
            )
        for pk in locations:
            refresh_location(c, pk)
        return {"idejemplarbolsa": bolsa}


def admit(request, d):
    with clinical_operation(request), connection.cursor() as c:
        professional(c, request)
        patient(c, d["idpersona"])
        restrictions(c, d["idpersona"])
        a = one(
            c, "SELECT * FROM citadonacion WHERE idcita=%s FOR UPDATE", [d["idcita"]]
        )
        if (
            a["idpersona"] != d["idpersona"]
            or a["estadocita"] != "Programada"
            or not a["prefiltroaprobado"]
        ):
            raise ValidationError(
                "Verifique identidad, prefiltro aprobado y cita programada."
            )
        c.execute(
            "UPDATE citadonacion SET asistenciaconfirmada=true WHERE idcita=%s",
            [d["idcita"]],
        )
        audit(
            c,
            request,
            "citadonacion",
            d["idcita"],
            "CU08 identidad verificada y asistencia confirmada",
        )
        return {"idcita": d["idcita"]}


def refresh_location(c, pk):
    c.execute(
        "UPDATE ubicacionalmacen SET capacidadocupada=(SELECT count(*) FROM ejemplarbolsa WHERE idubicacion=%s AND estadobolsak NOT IN ('Baja','Despachada')) WHERE idubicacion=%s",
        [pk, pk],
    )
