"""Escenarios académicos identificados. Sin Stripe/Brevo. Aplicación explícita."""

import os, sys, json, secrets, argparse, subprocess
from pathlib import Path
from datetime import datetime, timedelta, time, timezone as tz
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
PROFILES = {
    "admin": "ADMIN",
    "medico": "DOC_TRIAJE",
    "bioquimico": "BIOQ_INTEGRAL",
    "logistica": "TEC_LOGISTICA",
    "colecta": "PERS_COLECTA",
    "solicitante": "MED_SOLICITANTE",
    "donante": "DONANTE",
    "postulante": "POSIBLE_DONADOR",
    "receptor": "RECEPTOR",
    "laboratorio": "POSIBLE_DONADOR",
    "temporal": "POSIBLE_DONADOR",
    "definitivo": "POSIBLE_DONADOR",
}


def seed():
    from django.db import connection, transaction
    from django.contrib.auth.hashers import make_password
    from apps.seguridad.models import Usuario
    from rest_framework.test import APIRequestFactory, force_authenticate
    from apps.agenda import views as av
    from apps.laboratorio.views import AnalisisView, LiberarView
    from apps.clinica.views import DiferimientoView
    from apps.finanzas.views import DeudaView, PagoView
    from apps.agenda.services import requirements
    from psycopg2.extras import Json
    from django.utils import timezone

    users = {}
    people = {}
    credentials = {}
    result = {"perfiles": {}, "escenarios": {}}

    def call(view, key, data, **kw):
        req = APIRequestFactory().post("/", data, format="json")
        force_authenticate(req, user=users[key], token={"rolActivo": PROFILES[key]})
        response = view.as_view()(req, **kw)
        if response.status_code not in (200, 201):
            raise RuntimeError(f"{view.__name__}: {response.data}")
        return response.data

    with transaction.atomic(), connection.cursor() as c:
        c.execute("SET LOCAL lock_timeout='5s'")
        c.execute("SELECT pg_advisory_xact_lock(82007)")
        c.execute("SELECT 1 FROM usuario WHERE username LIKE 'demo.c23.%' LIMIT 1")
        if c.fetchone():
            raise RuntimeError(
                "Ya existen perfiles demo.c23; no se reinician ni duplican. Consultar credenciales privadas."
            )
        # Bloqueo y avance de secuencias de tablas usadas, conservando contadores altos.
        tables = [
            "persona",
            "usuario",
            "bitacoraauditoria",
            "agendaturno",
            "citadonacion",
            "detallecitarequisito",
            "triajeclinico",
            "extracciondonacion",
            "consentimientoinformado",
            "unidadsangretotal",
            "ejemplarbolsa",
            "analisisinmunoserologico",
            "analisisinmunohematologico",
            "diferimiento",
            "incentivoentrega",
            "ubicacionalmacen",
            "programacionautologa",
            "programacionautologahistorial",
            "institucionsalud",
            "solicitudhospitalaria",
            "detallesolicitud",
            "deudafinanciera",
            "pagofinanciero",
            "comprobantepago",
        ]
        from psycopg2 import sql

        for table in sorted(tables):
            c.execute(
                sql.SQL("LOCK TABLE public.{} IN SHARE ROW EXCLUSIVE MODE").format(
                    sql.Identifier(table)
                )
            )
            c.execute(
                "SELECT attname,pg_get_serial_sequence(%s,attname) FROM pg_attribute WHERE attrelid=%s::regclass AND attnum>0 AND NOT attisdropped",
                ["public." + table, "public." + table],
            )
            for column, seq in c.fetchall():
                if not seq:
                    continue
                c.execute(
                    sql.SQL("SELECT max({}) FROM public.{}").format(
                        sql.Identifier(column), sql.Identifier(table)
                    )
                )
                maximum = c.fetchone()[0]
                c.execute(sql.SQL("SELECT last_value FROM {}").format(sql.SQL(seq)))
                last = c.fetchone()[0]
                if maximum is not None and maximum >= last:
                    c.execute("SELECT setval(%s::regclass,%s,true)", [seq, maximum])
        c.execute(
            "SELECT set_config('hemovida.origen','demo_academico_ciclos23',true),set_config('hemovida.rol_activo','Carga DEMO autorizada',true),set_config('hemovida.usuario_id','',true)"
        )
        for key, role in PROFILES.items():
            c.execute("SELECT idrol FROM rol WHERE codigorol=%s", [role])
            r = c.fetchone()
            if not r:
                raise RuntimeError("Falta rol " + role)
            password = "Hv#9" + secrets.token_urlsafe(18)
            username = "demo.c23." + key
            c.execute(
                "INSERT INTO persona(ci,nombres,apellidos,sexo,fechanacimiento,direccion,ocupacion) VALUES(%s,'DEMO',%s,'M','1990-01-01','Datos sintéticos para demostración','Escenario académico ciclos 2 y 3') RETURNING idpersona",
                ["DEMO-C23-" + key.upper(), key.capitalize()],
            )
            pid = c.fetchone()[0]
            people[key] = pid
            c.execute(
                "INSERT INTO usuario(idpersona,username,email,passwordhash) VALUES(%s,%s,%s,%s) RETURNING idusuario",
                [pid, username, username + "@example.test", make_password(password)],
            )
            uid = c.fetchone()[0]
            c.execute(
                "INSERT INTO usuariorol(idusuario,idrol) VALUES(%s,%s)", [uid, r[0]]
            )
            if role in [
                "ADMIN",
                "DOC_TRIAJE",
                "BIOQ_INTEGRAL",
                "TEC_LOGISTICA",
                "PERS_COLECTA",
                "MED_SOLICITANTE",
            ]:
                c.execute(
                    "INSERT INTO personalsalud(idpersona,cargo,registroprofesional) VALUES(%s,%s,%s)",
                    [pid, "DEMO " + role, "DEMO-C23-" + key.upper()],
                )
            else:
                c.execute(
                    "INSERT INTO posibledonador(idpersona,estadoaptitud,carnetprovisionalcodigo) VALUES(%s,'En Evaluacion',%s)",
                    [pid, "HV-POST-C23-" + key.upper()],
                )
            users[key] = Usuario.objects.get(pk=uid)
            credentials[key] = {"usuario": username, "clave": password, "rol": role}
            result["perfiles"][key] = {
                "usuario": username,
                "rol": role,
                "idpersona": pid,
            }
        c.execute(
            "SELECT idgrupo FROM gruposanguineo WHERE grupoabo='O' AND factorrh='Positivo'"
        )
        group = c.fetchone()[0]
        c.execute(
            "INSERT INTO receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor,idgrupo) VALUES(%s,'DEMO-C23-HC','O Positivo',%s)",
            [people["receptor"], group],
        )
        today = timezone.now().astimezone(ZoneInfo("America/La_Paz")).date()
        future = today + timedelta(days=1)
        while future.weekday() >= 5:
            future += timedelta(days=1)
        call(av.Turnos, "admin", {"fecha": str(future)})
        c.execute(
            "SELECT t.idturno FROM agendaturno t WHERE (t.inicio AT TIME ZONE 'America/La_Paz')::date=%s AND habilitado AND NOT EXISTS(SELECT 1 FROM citadonacion a WHERE a.idturno=t.idturno AND a.estadocita IN ('Programada','Atendida','Inasistencia')) ORDER BY t.inicio LIMIT 2",
            [future],
        )
        slots = [x[0] for x in c.fetchall()]
        assert len(slots) == 2
        reqs, version = requirements(c)
        if not reqs:
            raise RuntimeError("Sin requisitos vigentes")
        answers = [
            {
                "idrequisito": r["idrequisito"],
                "cumple": True,
                "observacion": "DEMO académico",
            }
            for r in reqs
        ]
        booking = call(
            av.Citas,
            "postulante",
            {
                "idturno": slots[0],
                "tipoatencion": "Evaluacion",
                "versioncatalogo": version,
                "respuestas": answers,
            },
        )
        program = call(
            av.CrearPrograma,
            "solicitante",
            {
                "idreceptor": people["receptor"],
                "fechacirugia": str(today + timedelta(days=30)),
                "indicacion": "DEMO académico sin cirugía real; pendiente de revisión bioquímica",
                "referenciamedica": "DEMO-C23-AUTO",
            },
        )
        result["escenarios"]["cita_futura"] = dict(booking)
        result["escenarios"]["fecha_agenda"] = str(future)
        result["escenarios"]["programa_pendiente"] = dict(program)
        # Historial importado sintético del último día hábil, con relaciones completas.
        # No representa la ejecución de una nueva colecta hoy ni una firma humana.
        histday = today - timedelta(days=1)
        while histday.weekday() >= 5:
            histday -= timedelta(days=1)
        for n, key in enumerate(["donante", "laboratorio", "temporal", "definitivo"]):
            pid = people[key]
            start = datetime.combine(
                histday, time(9, n * 15), ZoneInfo("America/La_Paz")
            )
            c.execute("SELECT idturno FROM agendaturno WHERE inicio=%s", [start])
            t = c.fetchone()
            if t:
                slot = t[0]
                c.execute(
                    "SELECT 1 FROM citadonacion WHERE idturno=%s AND estadocita IN ('Programada','Atendida','Inasistencia')",
                    [slot],
                )
                if c.fetchone():
                    raise RuntimeError(
                        "Intervalo histórico ocupado; ajustar escenario sin pisar registros"
                    )
            else:
                c.execute(
                    "INSERT INTO agendaturno(inicio,fin,cupo,creadopor) VALUES(%s,%s,1,%s) RETURNING idturno",
                    [start, start + timedelta(minutes=15), users["admin"].pk],
                )
                slot = c.fetchone()[0]
            stamp = start.astimezone(tz.utc).replace(tzinfo=None)
            c.execute(
                "INSERT INTO citadonacion(idpersona,fechahoraprogramada,idturno,tipoatencion,prefiltroaprobado,asistenciaconfirmada,estadocita) VALUES(%s,%s,%s,'Evaluacion',true,true,'Atendida') RETURNING idcita",
                [pid, stamp, slot],
            )
            appt = c.fetchone()[0]
            c.execute(
                "INSERT INTO prefiltrocita(idcita,idusuario,versioncatalogo,catalogo,respuestas,aprobado) VALUES(%s,%s,%s,%s,%s,true)",
                [appt, users["admin"].pk, version, Json(reqs), Json(answers)],
            )
            for a in answers:
                c.execute(
                    "INSERT INTO detallecitarequisito(idcita,idrequisito,cumplerequisito,observacionrespuesta) VALUES(%s,%s,true,'DEMO histórico sintético')",
                    [appt, a["idrequisito"]],
                )
            apt = key in ["donante", "laboratorio"]
            c.execute(
                "INSERT INTO triajeclinico(idposibledonador,idpersonalsalud,fechahora,pesokg,presionsistolicammhg,presiondiastolicammhg,nivelhemoglobina,temperatura,resultadoaptitud,observaciones) VALUES(%s,%s,%s,70,120,80,%s,36.5,%s,'DEMO académico importado; no atención real') RETURNING idtriaje",
                [
                    pid,
                    people["medico"],
                    stamp,
                    14 if apt else 11,
                    "Apto" if apt else "Rechazado",
                ],
            )
            triage = c.fetchone()[0]
            if not apt:
                defer = call(
                    DiferimientoView,
                    "medico",
                    {
                        "idpersona": pid,
                        "idtriaje": triage,
                        "tipo": "Temporal" if key == "temporal" else "Definitivo",
                        "diasinhabilitacion": 30 if key == "temporal" else 0,
                        "motivodetallado": "DEMO académico: escenario de revisión, sin diagnóstico real",
                    },
                )
                result["escenarios"][key] = dict(defer)
                continue
            c.execute(
                "INSERT INTO extracciondonacion(idpersonadonante,idpersonalsalud,codigoextraccion,fechahora,volumenextraidoml,brazoextraccion,idtriaje) VALUES(%s,%s,%s,%s,450,'Derecho',%s) RETURNING idextraccion",
                [
                    pid,
                    people["colecta"],
                    "DEMO-C23-EXT-" + key.upper(),
                    stamp + timedelta(minutes=20),
                    triage,
                ],
            )
            ext = c.fetchone()[0]
            c.execute(
                "INSERT INTO consentimientoinformado(idextraccion,fechafirma,declaracionjuradaaceptada,firmadigital) VALUES(%s,%s,true,'DEMO SINTETICO SIN FIRMA HUMANA NI ACTO CLINICO REAL')",
                [ext, stamp],
            )
            c.execute(
                "INSERT INTO unidadsangretotal(idextraccion,idgrupo,codigobolsamadre,tipobolsa) VALUES(%s,%s,%s,'Cuadruple') RETURNING idunidadmadre",
                [ext, group, "DEMO-C23-MAD-" + key.upper()],
            )
            mother = c.fetchone()[0]
            c.execute(
                "INSERT INTO ubicacionalmacen(identificadorcompartimento,tipoequipo,temperaturaregistro,capacidadmaxima,tieneagitacion) VALUES(%s,'Refrigerador DEMO',4,20,false) RETURNING idubicacion",
                ["DEMO-C23-FRIO-" + key.upper()],
            )
            location = c.fetchone()[0]
            c.execute(
                "INSERT INTO ejemplarbolsa(idunidadmadre,idgrupo,idubicacion,codigoejemplark,tipocomponente,volumenml,capacidadbolsaml,fechaextraccion,fechacaducidad) VALUES(%s,%s,%s,%s,'Concentrado de Globulos Rojos',250,350,%s,%s) RETURNING idejemplarbolsa",
                [
                    mother,
                    group,
                    location,
                    "DEMO-C23-COMP-" + key.upper(),
                    histday,
                    histday + timedelta(days=35),
                ],
            )
            component = c.fetchone()[0]
            sero = dict(
                codigoanalisis="DEMO-C23-SER-" + key.upper(),
                dictamenfinal="Apto",
                **{
                    k: "No Reactivo"
                    for k in [
                        "resultadovih",
                        "resultadochagas",
                        "resultadohepatitisb",
                        "resultadohepatitisc",
                        "resultadosifilis",
                        "resultadohtlv",
                    ]
                },
            )
            call(AnalisisView, "bioquimico", sero, madre=mother, tipo="serologia")
            if key == "donante":
                call(
                    AnalisisView,
                    "bioquimico",
                    dict(
                        grupoaboconfirmado="O",
                        factorrhconfirmado="Positivo",
                        pruebacoombsdirecta="Negativo",
                        pruebacoombsindirecta="Negativo",
                        rastreoanticuerposirregulares="Negativo",
                        dictameninmunohematologico="Apto",
                        observaciones="DEMO académico sin análisis real",
                    ),
                    madre=mother,
                    tipo="hematologia",
                )
                call(LiberarView, "bioquimico", {}, madre=mother)
                c.execute(
                    "INSERT INTO donante(idpersona,carnetdigitalcodigo,tipodonante,estadohabilitacion,fechaultimadonacion) VALUES(%s,'DEMO-C23-CARNET','Voluntario Altruista','Apto',%s) ON CONFLICT(idpersona) DO UPDATE SET carnetdigitalcodigo=EXCLUDED.carnetdigitalcodigo,fechaultimadonacion=EXCLUDED.fechaultimadonacion",
                    [pid, histday],
                )
            incentive = call(
                av.Incentivos,
                "colecta",
                dict(
                    idextraccion=ext,
                    refrigerioentregado=key == "donante",
                    tipoarticulo="DEMO incentivo académico",
                ),
            )
            result["escenarios"][key] = {
                "madre": mother,
                "componente": component,
                "extraccion": ext,
                "incentivo": incentive["idincentivo"],
            }
        c.execute(
            "INSERT INTO institucionsalud(nombreinstitucion,tipoinstitucion,direccion) VALUES('DEMO C23 Institución académica','Pruebas','Sin atención real') RETURNING idinstitucion"
        )
        inst = c.fetchone()[0]
        for n in [1, 2]:
            c.execute(
                "INSERT INTO solicitudhospitalaria(idinstitucion,idreceptor,numerosolicitud,prioridadsolicitud,motivotransfusion,cantidadbolsassolicitadas) VALUES(%s,%s,%s,'Programada','DEMO académico sin orden real',1) RETURNING idsolicitud",
                [inst, people["receptor"], f"DEMO-C23-SOL-{n}"],
            )
            sol = c.fetchone()[0]
            c.execute(
                "INSERT INTO detallesolicitud(idsolicitud,idgrupo,tipocomponenterequerido,cantidadsolicitada) VALUES(%s,%s,'Concentrado de Globulos Rojos',1)",
                [sol, group],
            )
            debt = call(
                DeudaView,
                "admin",
                dict(
                    idsolicitud=sol,
                    montooriginal=200 if n == 2 else 100,
                    motivodeuda="DEMO académico sin servicio real",
                ),
            )
            if n == 2:
                call(
                    PagoView,
                    "admin",
                    dict(
                        montopagado=50,
                        metodopago="Efectivo",
                        referenciaexterna="DEMO-C23-PAGO-SINTETICO",
                    ),
                    deuda=debt["iddeuda"],
                )
            result["escenarios"]["deuda_" + str(n)] = debt["iddeuda"]
        c.execute(
            "SELECT estadobolsak FROM ejemplarbolsa WHERE idejemplarbolsa=%s",
            [result["escenarios"]["donante"]["componente"]],
        )
        assert c.fetchone()[0] == "Disponible"
        c.execute(
            "SELECT estadobolsak FROM ejemplarbolsa WHERE idejemplarbolsa=%s",
            [result["escenarios"]["laboratorio"]["componente"]],
        )
        assert c.fetchone()[0] == "En Cuarentena"
        c.execute("SELECT count(*) FROM usuario WHERE username LIKE 'demo.c23.%'")
        assert c.fetchone()[0] == len(PROFILES)
    return result, credentials


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--local", action="store_true")
    parser.add_argument("--aplicar", action="store_true")
    args = parser.parse_args()
    if not args.aplicar:
        print(
            "Prepara 12 perfiles y escenarios DEMO. Usar --aplicar; --local restringe destino a PostgreSQL local."
        )
        return
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hemovida_project.settings")
    if args.local:
        os.environ["USE_SQLITE"] = "true"
        from django.conf import settings

        settings.DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "HOST": "127.0.0.1",
                "PORT": "55439",
                "NAME": "hemo_liberacion_test",
                "USER": "hemovida_test",
                "PASSWORD": "",
            }
        }
    import django

    django.setup()
    directory = ROOT / ".venv/demo_integral" / ("local" if args.local else "supabase")
    directory.mkdir(parents=True, exist_ok=True)
    from django.db import connection
    from django.conf import settings

    if not args.local:
        config = settings.DATABASES["default"]
        assert str(config["PORT"]) == "6543"
        env = os.environ.copy()
        env.update(
            PGHOST=str(config["HOST"]),
            PGPORT=str(config["PORT"]),
            PGDATABASE=str(config["NAME"]),
            PGUSER=str(config["USER"]),
            PGPASSWORD=str(config["PASSWORD"]),
            PGSSLMODE="require",
        )
        dump = directory / (
            "antes_" + datetime.now(tz.utc).strftime("%Y%m%dT%H%M%SZ") + ".dump"
        )
        run = subprocess.run(
            [
                "C:/Program Files/PostgreSQL/18/bin/pg_dump.exe",
                "--format=custom",
                "--schema=public",
                "--lock-wait-timeout=5000",
                "--file",
                str(dump),
            ],
            env=env,
            capture_output=True,
            timeout=180,
        )
        if run.returncode or not dump.exists() or not dump.stat().st_size:
            raise RuntimeError("Respaldo incompleto; carga cancelada")
    result, credentials = seed()
    # Algunos triggers heredados cambian el rol al registrar serología.
    # Registrar los perfiles que quedaron realmente asignados, no los iniciales.
    from apps.seguridad.models import Usuario

    for key, item in credentials.items():
        assigned = list(
            Usuario.objects.get(username=item["usuario"]).roles.values_list(
                "codigoRol", flat=True
            )
        )
        item["roles"] = assigned
        item["rol"] = assigned[0]
        result["perfiles"][key]["roles"] = assigned
        result["perfiles"][key]["rol"] = assigned[0]

    (directory / "credenciales.json").write_text(
        json.dumps(credentials, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (directory / "resultado.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
    )
    print(
        "Carga confirmada:",
        len(credentials),
        "perfiles. Credenciales privadas:",
        directory / "credenciales.json",
    )
    print("Escenarios:", ", ".join(result["escenarios"]))
    connection.close()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
