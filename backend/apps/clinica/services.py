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
            from hemovida_project.clinical_time import require_calendar

            require_calendar(c)
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
        "SELECT 1 FROM diferimiento WHERE idposibledonador=%s AND fechainiciodiferimiento<=public.hemo_dia_clinico() AND (fechafindiferimiento IS NULL OR fechafindiferimiento>=public.hemo_dia_clinico())",
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
        if d["resultadoaptitud"] == "Apto":
            c.execute(
                "SELECT extract(year FROM age(public.hemo_dia_clinico(),fechanacimiento))>=18 FROM persona WHERE idpersona=%s",
                [d["idpersona"]],
            )
            if not c.fetchone()[0]:
                raise ValidationError(
                    "El proyecto exige mayoría de edad para un dictamen Apto."
                )
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
            "SELECT 1 FROM triajeclinico WHERE idposibledonador=%s AND public.hemo_fecha_clinica(fechahora)=public.hemo_dia_clinico()",
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
        if d.get("observaciones"):
            revision07(c)
            c.execute(
                "UPDATE triajeclinico SET observaciones=%s WHERE idtriaje=%s",
                [d["observaciones"], r["idtriaje"]],
            )
            r["observaciones"] = d["observaciones"]
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
        if d.get("idtriaje"):
            t = one(
                c,
                "SELECT idposibledonador AS idpersona FROM triajeclinico WHERE idtriaje=%s FOR UPDATE",
                [d["idtriaje"]],
            )
        else:
            revision07(c)
            table, pk = (
                ("analisisinmunoserologico", "idanalisis")
                if d.get("idserologia")
                else ("analisisinmunohematologico", "idanalisishematologico")
            )
            ident = d.get("idserologia") or d["idhematologia"]
            t = one(
                c,
                f"SELECT e.idpersonadonante AS idpersona FROM {table} a JOIN unidadsangretotal m USING(idunidadmadre) JOIN extracciondonacion e USING(idextraccion) WHERE a.{pk}=%s",
                [ident],
            )
        if t["idpersona"] != d["idpersona"]:
            raise ValidationError("La evaluación pertenece a otra persona.")
        restrictions(c, d["idpersona"])
        r = one(
            c,
            "INSERT INTO diferimiento(idtriaje,idposibledonador,motivodetallado,diasinhabilitacion,fechainiciodiferimiento,fechafindiferimiento) VALUES(%s,%s,%s,%s,public.hemo_dia_clinico(),CASE WHEN %s='Temporal' THEN public.hemo_dia_clinico()+%s ELSE NULL END) RETURNING *",
            [
                d.get("idtriaje"),
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
            "UPDATE citadonacion SET estadocita='Cancelada' WHERE idpersona=%s AND estadocita='Programada' AND fechahoraprogramada>=CURRENT_TIMESTAMP AND (%s::date IS NULL OR public.hemo_fecha_clinica(fechahoraprogramada)<=%s::date) RETURNING idcita",
            [d["idpersona"], r["fechafindiferimiento"], r["fechafindiferimiento"]],
        )
        ids = [x[0] for x in c.fetchall()]
        if d.get("idserologia") or d.get("idhematologia"):
            c.execute(
                "UPDATE diferimiento SET idserologia=%s,idhematologia=%s WHERE iddiferimiento=%s",
                [d.get("idserologia"), d.get("idhematologia"), r["iddiferimiento"]],
            )

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
        if d.get("autologa"):
            from apps.agenda.autologous import ready09, validate_program

            ready09(c)
            validate_program(c, d["idprograma"], p["idpersona"], d["fechacirugia"])
        latest = one(
            c,
            "SELECT idtriaje,resultadoaptitud,public.hemo_fecha_clinica(fechahora)=public.hemo_dia_clinico() AS hoy FROM triajeclinico WHERE idposibledonador=%s ORDER BY fechahora DESC,idtriaje DESC LIMIT 1 FOR UPDATE",
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
        c.execute("SELECT to_regclass('public.incidenciacolecta')")
        if c.fetchone()[0]:
            c.execute(
                "SELECT 1 FROM incidenciacolecta WHERE idtriaje=%s", [d["idtriaje"]]
            )
            if c.fetchone():
                raise ValidationError(
                    "La colecta de este triaje fue interrumpida; requiere reevaluación."
                )
        c.execute("SELECT 1 FROM extracciondonacion WHERE idtriaje=%s", [d["idtriaje"]])
        if c.fetchone():
            raise ValidationError("El triaje ya tiene una extracción.")
        c.execute(
            "SELECT 1 FROM extracciondonacion WHERE idpersonadonante=%s AND public.hemo_fecha_clinica(fechahora) + %s > public.hemo_dia_clinico()",
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
        if d.get("autologa"):
            revision07(c)
            one(
                c, "SELECT idpersona FROM receptor WHERE idpersona=%s", [p["idpersona"]]
            )
            c.execute(
                "SELECT %s::date > public.hemo_dia_clinico()", [d["fechacirugia"]]
            )
            if not c.fetchone()[0]:
                raise ValidationError("La cirugía debe ser futura.")
            c.execute(
                "INSERT INTO colectaautologa(idunidadmadre,idreceptor,fechacirugia,idpersonalsalud,idprograma) VALUES(%s,%s,%s,%s,%s)",
                [
                    m["idunidadmadre"],
                    p["idpersona"],
                    d["fechacirugia"],
                    staff,
                    d["idprograma"],
                ],
            )
        c.execute(
            "UPDATE donante SET fechaultimadonacion=public.hemo_dia_clinico() WHERE idpersona=%s",
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
        revision07(c)
        bloquear_madre(c, madre)
        m = one(
            c,
            "SELECT m.*,e.fechahora,e.volumenextraidoml FROM unidadsangretotal m JOIN extracciondonacion e USING(idextraccion) WHERE idunidadmadre=%s",
            [madre],
        )
        c.execute(
            "SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' BETWEEN %s::timestamp AND %s::timestamp + interval '8 hours'",
            [m["fechahora"], m["fechahora"]],
        )
        if not c.fetchone()[0] or m["estadoliberacion"] != "En Cuarentena":
            raise ValidationError(
                "Madre fuera del plazo o estado de fraccionamiento (8 horas)."
            )
        c.execute("SELECT 1 FROM ejemplarbolsa WHERE idunidadmadre=%s", [madre])
        if c.fetchone():
            raise ValidationError("La madre ya fue fraccionada.")
        c.execute("SELECT * FROM colectaautologa WHERE idunidadmadre=%s", [madre])
        autologa_row = c.fetchone()
        autologa = (
            dict(zip([x[0] for x in c.description], autologa_row))
            if autologa_row
            else None
        )
        if autologa and autologa.get("idprograma"):
            from apps.agenda.autologous import validate_program

            validate_program(
                c,
                autologa["idprograma"],
                autologa["idreceptor"],
                autologa["fechacirugia"],
                lock=False,
                allow_today=True,
            )
        c.execute(
            "SELECT 1 FROM donante WHERE idpersona=(SELECT idpersonadonante FROM extracciondonacion WHERE idextraccion=%s) AND tipodonante='Autologo'",
            [m["idextraccion"]],
        )
        if c.fetchone() and not autologa:
            raise ValidationError(
                "La colecta autóloga debe tener paciente y fecha quirúrgica registrados."
            )
        parts = d["componentes"]
        if sum(p["volumenml"] for p in parts) > m["volumenextraidoml"]:
            raise ValidationError("Balance excede el volumen extraído.")
        locations = lock_locations(c, [p["idubicacion"] for p in parts])
        for pk, loc in locations.items():
            space(c, loc, sum(p["idubicacion"] == pk for p in parts))
        ids = []
        for p in parts:
            protocol = conservation(c, locations[p["idubicacion"]], p["tipocomponente"])
            days = protocol["diasconservacion"]
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
                "INSERT INTO ejemplarbolsa(idunidadmadre,idgrupo,idubicacion,codigoejemplark,tipocomponente,volumenml,capacidadbolsaml,fechaextraccion,fechacaducidad,categoriaetaria) VALUES(%s,%s,%s,%s,%s,%s,%s,public.hemo_fecha_clinica(%s::timestamp),public.hemo_fecha_clinica(%s::timestamp)+%s,%s) RETURNING idejemplarbolsa",
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
            if autologa:
                receptor, fecha = autologa["idreceptor"], autologa["fechacirugia"]
                c.execute(
                    "SELECT %s::date<=public.hemo_fecha_clinica(%s::timestamp)+%s",
                    [fecha, m["fechahora"], days],
                )
                if not c.fetchone()[0]:
                    raise ValidationError(
                        "El componente caduca antes de la cirugía programada."
                    )
                c.execute(
                    "UPDATE ejemplarbolsa SET esexclusivoautologo=true WHERE idejemplarbolsa=%s",
                    [r["idejemplarbolsa"]],
                )
                c.execute(
                    "INSERT INTO reservasangre(idreceptor,idejemplarbolsa,esautologa,motivoreserva,fechavencimientoreserva) VALUES(%s,%s,true,'Custodia autologa exclusiva',%s)",
                    [receptor, r["idejemplarbolsa"], fecha],
                )

        for pk in locations:
            refresh_location(c, pk)
        return {"idunidadmadre": madre, "componentes": ids}


def custody(request, bolsa, d, baja=False, autologa=False):
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
        if b["estadobolsak"] in ["Despachada", "Baja"]:
            raise ValidationError("Componente ya despachado o dado de baja.")
        if autologa:
            revision07(c)
            owner = one(
                c,
                "SELECT idreceptor FROM colectaautologa WHERE idunidadmadre=%s",
                [b["idunidadmadre"]],
            )
            c.execute(
                "SELECT 1 FROM reservasangre WHERE idejemplarbolsa=%s AND idreceptor=%s AND esautologa AND estadoreserva='Activa' AND fechavencimientoreserva>=public.hemo_dia_clinico()",
                [bolsa, owner["idreceptor"]],
            )
            if not b["esexclusivoautologo"] or not c.fetchone():
                raise ValidationError(
                    "No hay una reserva autóloga exclusiva vigente para este componente."
                )
        elif b["estadobolsak"] == "Reservada" or b["esexclusivoautologo"]:
            raise ValidationError(
                "Utiliza la custodia autóloga o el circuito autorizado de reservas."
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
            revision07(c)
            conservation(c, loc, b["tipocomponente"])
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
        c.execute(
            "SELECT ((%s::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date",
            [a["fechahoraprogramada"]],
        )
        if not c.fetchone()[0]:
            raise ValidationError(
                "La asistencia solo se confirma el día de la cita, en hora de Bolivia."
            )
        if a.get("idturno"):
            from apps.agenda.services import requirements

            c.execute("LOCK TABLE requisitodonacion IN SHARE MODE")
            _, version = requirements(c)
            c.execute(
                "SELECT (aprobado OR %s) AND versioncatalogo=%s FROM prefiltrocita WHERE idcita=%s",
                [a.get("tipoatencion") == "Evaluacion", version, d["idcita"]],
            )
            snapshot = c.fetchone()
            if not snapshot or not snapshot[0]:
                raise ValidationError(
                    "El prefiltro cambió o está pendiente; requiere revisión antes de admitir."
                )
        if a.get("idprograma"):
            from apps.agenda.autologous import validate_program

            validate_program(c, a["idprograma"], d["idpersona"], lock=False)
        if (
            a["idpersona"] != d["idpersona"]
            or a["estadocita"] != "Programada"
            or (
                not a["prefiltroaprobado"]
                and not (a.get("idturno") and a.get("tipoatencion") == "Evaluacion")
            )
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


def revision07(c):
    from hemovida_project.schema_checks import missing_cycle3

    if missing_cycle3(c):
        from rest_framework.exceptions import APIException

        e = APIException("Esta función requiere aplicar la migración 07 de ciclo 3.")
        e.status_code = 503
        raise e


def conservation(c, loc, component):
    c.execute(
        "SELECT * FROM protocoloconservacion WHERE tipocomponente=%s", [component]
    )
    row = c.fetchone()
    if not row:
        raise ValidationError(
            "Logística debe configurar un protocolo académico de conservación para "
            + component
        )
    protocol = dict(zip([x[0] for x in c.description], row))
    if (
        not protocol["temperaturamin"]
        <= loc["temperaturaregistro"]
        <= protocol["temperaturamax"]
    ):
        raise ValidationError(
            "Temperatura incompatible con el protocolo de " + component
        )
    if protocol["requiereagitacion"] and not loc.get("tieneagitacion"):
        raise ValidationError(
            "El componente requiere un equipo con agitación confirmada."
        )
    return protocol


def protocol(request, d):
    with clinical_operation(request), connection.cursor() as c:
        revision07(c)
        staff = professional(c, request)
        r = one(
            c,
            "INSERT INTO protocoloconservacion(tipocomponente,temperaturamin,temperaturamax,diasconservacion,requiereagitacion,aprobadopor,contexto,referencia) VALUES(%s,%s,%s,%s,%s,%s,'Academico',%s) ON CONFLICT(tipocomponente) DO UPDATE SET temperaturamin=excluded.temperaturamin,temperaturamax=excluded.temperaturamax,diasconservacion=excluded.diasconservacion,requiereagitacion=excluded.requiereagitacion,aprobadopor=excluded.aprobadopor,fechaaprobacion=now(),contexto='Academico',referencia=excluded.referencia RETURNING *",
            [
                d["tipocomponente"],
                d["temperaturamin"],
                d["temperaturamax"],
                d["diasconservacion"],
                d["requiereagitacion"],
                staff,
                d["referencia"],
            ],
        )
        audit(
            c,
            request,
            "protocoloconservacion",
            None,
            "CU15 configuración académica de conservación para " + d["tipocomponente"],
        )
        return r


def incident(request, d):
    with clinical_operation(request), connection.cursor() as c:
        revision07(c)
        staff = professional(c, request)
        t = one(c, "SELECT * FROM triajeclinico WHERE idtriaje=%s", [d["idtriaje"]])
        patient(c, t["idposibledonador"])
        c.execute(
            "SELECT 1 FROM extracciondonacion WHERE idtriaje=%s UNION ALL SELECT 1 FROM incidenciacolecta WHERE idtriaje=%s",
            [d["idtriaje"], d["idtriaje"]],
        )
        if c.fetchone():
            raise ValidationError("El triaje ya tiene colecta o incidencia registrada.")
        return one(
            c,
            "INSERT INTO incidenciacolecta(idtriaje,idpersonalsalud,motivo,volumenobtenidoml) VALUES(%s,%s,%s,%s) RETURNING *",
            [d["idtriaje"], staff, d["motivo"], d["volumenobtenidoml"]],
        )


def communicate(request, diferimiento, d):
    with clinical_operation(request), connection.cursor() as c:
        revision07(c)
        staff = professional(c, request)
        r = one(
            c,
            "UPDATE diferimiento SET comunicacionfecha=now(),canalcomunicacion=%s,comunicadopor=%s WHERE iddiferimiento=%s RETURNING *",
            [d["canal"], staff, diferimiento],
        )
        audit(
            c,
            request,
            "diferimiento",
            diferimiento,
            "CU11 comunicación confirmada por " + d["canal"],
        )
        return r


def discard_mother(request, madre, d):
    with clinical_operation(request), connection.cursor() as c:
        staff = professional(c, request)
        bloquear_madre(c, madre)
        m = one(c, "SELECT * FROM unidadsangretotal WHERE idunidadmadre=%s", [madre])
        if m["estadoliberacion"] == "Rechazada":
            raise ValidationError("Madre ya rechazada.")
        parts = rows(
            c,
            "SELECT * FROM ejemplarbolsa WHERE idunidadmadre=%s ORDER BY idejemplarbolsa FOR UPDATE",
            [madre],
        )
        if any(p["estadobolsak"] == "Despachada" for p in parts):
            raise ValidationError(
                "Hay componentes despachados: requiere revisión urgente y circuito de retiro."
            )
        locations = lock_locations(
            c, [p["idubicacion"] for p in parts if p["idubicacion"]]
        )
        for p in parts:
            c.execute(
                "UPDATE reservasangre SET estadoreserva='Cancelada' WHERE idejemplarbolsa=%s AND estadoreserva='Activa'",
                [p["idejemplarbolsa"]],
            )
        one(
            c,
            "INSERT INTO bajainventario(idunidadmadre,idpersonalsalud,motivobaja) VALUES(%s,%s,%s) RETURNING idbaja",
            [madre, staff, d["motivobaja"]],
        )
        c.execute(
            "UPDATE unidadsangretotal SET estadoliberacion='Rechazada' WHERE idunidadmadre=%s",
            [madre],
        )
        c.execute(
            "UPDATE ejemplarbolsa SET estadobolsak='Baja' WHERE idunidadmadre=%s AND estadobolsak<>'Baja'",
            [madre],
        )
        for pk in locations:
            refresh_location(c, pk)
        return {"idunidadmadre": madre, "componentes_afectados": len(parts)}


def equipment_conditions(request, ubicacion, d):
    with clinical_operation(request), connection.cursor() as c:
        revision07(c)
        professional(c, request)
        before = one(
            c,
            "SELECT * FROM ubicacionalmacen WHERE idubicacion=%s FOR UPDATE",
            [ubicacion],
        )
        result = one(
            c,
            "UPDATE ubicacionalmacen SET temperaturaregistro=%s,tieneagitacion=%s WHERE idubicacion=%s RETURNING *",
            [d["temperaturaregistro"], d["tieneagitacion"], ubicacion],
        )
        audit(
            c,
            request,
            "ubicacionalmacen",
            ubicacion,
            f"CU15 condiciones verificadas: temperatura {before['temperaturaregistro']} -> {d['temperaturaregistro']}; agitacion {d['tieneagitacion']}",
        )
        return result


def reactivate_autologous(request, madre, d):
    with clinical_operation(request), connection.cursor() as c:
        revision07(c)
        professional(c, request)
        bloquear_madre(c, madre)
        owner = one(c, "SELECT * FROM colectaautologa WHERE idunidadmadre=%s", [madre])
        if owner.get("idprograma"):
            from apps.agenda.autologous import validate_program

            validate_program(
                c,
                owner["idprograma"],
                owner["idreceptor"],
                owner["fechacirugia"],
                lock=False,
                allow_today=True,
            )
        c.execute(
            "SELECT hemo_lote_aprobado(%s),%s::date>=public.hemo_dia_clinico()",
            [madre, owner["fechacirugia"]],
        )
        approved, future = c.fetchone()
        if not approved or not future:
            raise ValidationError(
                "Reactivación requiere ambos análisis aprobados y cirugía vigente."
            )
        parts = rows(
            c,
            "SELECT * FROM ejemplarbolsa WHERE idunidadmadre=%s ORDER BY idejemplarbolsa FOR UPDATE",
            [madre],
        )
        if not parts:
            raise ValidationError("No hay componentes autólogos registrados.")
        for part in parts:
            if (
                not part["esexclusivoautologo"]
                or part["estadobolsak"] in ["Despachada", "Baja"]
                or part["fechacaducidad"] < owner["fechacirugia"]
            ):
                raise ValidationError(
                    "Algún componente no permite reactivar la custodia autóloga."
                )
            c.execute(
                "UPDATE reservasangre SET estadoreserva='Activa',fechavencimientoreserva=%s WHERE idejemplarbolsa=%s AND idreceptor=%s AND esautologa AND estadoreserva IN ('Cancelada','Vencida') RETURNING idreserva",
                [owner["fechacirugia"], part["idejemplarbolsa"], owner["idreceptor"]],
            )
            changed = c.fetchall()
            c.execute(
                "SELECT 1 FROM reservasangre WHERE idejemplarbolsa=%s AND esautologa AND idreceptor=%s AND estadoreserva='Activa'",
                [part["idejemplarbolsa"], owner["idreceptor"]],
            )
            if not c.fetchone():
                raise ValidationError(
                    "Falta la reserva original autóloga; no se sustituye por otra persona."
                )
            for row in changed:
                audit(
                    c,
                    request,
                    "reservasangre",
                    row[0],
                    "CU15 reserva autóloga reactivada tras revisión de análisis",
                )
        return {"idunidadmadre": madre, "reservas_verificadas": len(parts)}
