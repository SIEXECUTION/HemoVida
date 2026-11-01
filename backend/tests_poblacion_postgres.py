"""Regresión del SQL DEMO, exclusivamente en PostgreSQL local aislado."""

import unittest
import json
import hashlib
import uuid
from pathlib import Path

import psycopg2


class PoblacionPostgresTests(unittest.TestCase):
    def test_secuencia_desfasada_y_reejecucion_sin_duplicados(self):
        script = (
            Path(__file__).resolve().parents[1]
            / "database"
            / "revision_poblacion"
            / "02_poblacion_demo_revision.sql"
        ).read_text(encoding="utf-8")
        # La transacción de prueba controla el rollback para inspeccionar resultados.
        script = script.replace("BEGIN;", "", 1).rsplit("ROLLBACK;", 1)[0]
        with psycopg2.connect(
            host="127.0.0.1",
            port=55439,
            dbname="hemo_liberacion_test",
            user="hemovida_test",
            password="",
            connect_timeout=5,
        ) as conn:
            try:
                with conn.cursor() as c:
                    c.execute("SELECT current_database()")
                    self.assertEqual(c.fetchone()[0], "hemo_liberacion_test")
                    c.execute(
                        "SELECT coalesce(max(idinstitucion),0)+1000 FROM institucionsalud"
                    )
                    occupied = c.fetchone()[0]
                    c.execute(
                        "INSERT INTO institucionsalud(idinstitucion,nombreinstitucion,tipoinstitucion,direccion) VALUES(%s,'TEST secuencia','Pruebas','Local')",
                        [occupied],
                    )
                    c.execute(
                        "SELECT pg_get_serial_sequence('public.institucionsalud','idinstitucion')"
                    )
                    seq = c.fetchone()[0]
                    c.execute("SELECT setval(%s::regclass,%s,false)", [seq, occupied])
                    c.execute(
                        "INSERT INTO gruposanguineo(grupoabo,factorrh) SELECT 'O','Positivo' WHERE NOT EXISTS (SELECT 1 FROM gruposanguineo WHERE grupoabo='O' AND factorrh='Positivo')"
                    )
                    # Las cuentas y el catálogo se crean solo en esta transacción local.
                    token = uuid.uuid4().hex[:12]
                    c.execute(
                        "INSERT INTO persona(ci,nombres,apellidos,sexo,fechanacimiento) VALUES(%s,'TEST','Operador','M','1990-01-01') RETURNING idpersona",
                        ["TEST-" + token],
                    )
                    person = c.fetchone()[0]
                    c.execute(
                        "INSERT INTO personalsalud(idpersona,cargo,registroprofesional) VALUES(%s,'Pruebas',%s)",
                        [person, token],
                    )
                    c.execute(
                        "INSERT INTO usuario(idpersona,username,email,passwordhash) VALUES(%s,%s,%s,'unused') RETURNING idusuario",
                        [person, "test_" + token, token + "@example.test"],
                    )
                    operator = c.fetchone()[0]
                    for role in ["ADMIN", "DOC_TRIAJE"]:
                        c.execute(
                            "INSERT INTO rol(codigorol,nombrerol) SELECT %s,%s WHERE NOT EXISTS(SELECT 1 FROM rol WHERE codigorol=%s)",
                            [role, role, role],
                        )
                        c.execute(
                            "INSERT INTO usuariorol(idusuario,idrol) SELECT %s,idrol FROM rol WHERE codigorol=%s",
                            [operator, role],
                        )
                    c.execute(
                        "INSERT INTO requisitodonacion(nombrerequisito,tiporequisito) VALUES(%s,'Académico')",
                        ['Prueba de comillas " y acentos ñ'],
                    )
                    c.execute("SELECT count(*) FROM usuario")
                    users_before = c.fetchone()[0]
                    c.execute("SELECT count(*) FROM comprobantepago")
                    payments_before = c.fetchone()[0]
                    # El cierre se respeta aunque existan intervalos disponibles.
                    c.execute(
                        "INSERT INTO cierreagenda(fecha,motivo,idusuario) SELECT hemo_dia_clinico()+1,'TEST cierre',%s WHERE NOT EXISTS(SELECT 1 FROM cierreagenda WHERE fecha=hemo_dia_clinico()+1)",
                        [operator],
                    )
                    c.execute(script)
                    c.execute(
                        "SELECT idinstitucion FROM institucionsalud WHERE nombreinstitucion='DEMO C3 - Institución de pruebas'"
                    )
                    institution = c.fetchone()[0]
                    self.assertNotEqual(institution, occupied)
                    c.execute("SELECT count(*) FROM persona WHERE ci LIKE 'DEMO-C3-%'")
                    self.assertEqual(c.fetchone()[0], 6)
                    c.execute(
                        "SELECT c.idturno,c.prefiltroaprobado,c.tipoatencion,c.asistenciaconfirmada,t.inicio,t.fin,t.cupo,f.versioncatalogo,f.catalogo,f.respuestas,f.aprobado FROM citadonacion c JOIN persona p USING(idpersona) JOIN agendaturno t USING(idturno) JOIN prefiltrocita f USING(idcita) WHERE p.ci LIKE 'DEMO-C3-%' ORDER BY p.ci"
                    )
                    appointments = c.fetchall()
                    self.assertEqual(len(appointments), 4)
                    from zoneinfo import ZoneInfo

                    for row in appointments:
                        (
                            slot,
                            approved,
                            kind,
                            attended,
                            start,
                            end,
                            capacity,
                            version,
                            catalog,
                            answers,
                            snapshot_approved,
                        ) = row
                        local = start.astimezone(ZoneInfo("America/La_Paz"))
                        self.assertLess(local.weekday(), 5)
                        self.assertIn(local.hour, [8, 9, 10, 11, 13, 14, 15, 16])
                        self.assertIn(local.minute, [0, 15, 30, 45])
                        self.assertEqual((end - start).total_seconds(), 900)
                        self.assertEqual(
                            (capacity, kind, attended), (1, "Evaluacion", False)
                        )
                        self.assertEqual(approved, snapshot_approved)
                        self.assertEqual(
                            version,
                            hashlib.sha256(
                                json.dumps(
                                    catalog, ensure_ascii=False, sort_keys=True
                                ).encode()
                            ).hexdigest(),
                        )
                        self.assertEqual(len(answers), len(catalog))
                        c.execute(
                            "SELECT count(*) FROM detallecitarequisito d JOIN citadonacion a USING(idcita) WHERE a.idturno=%s",
                            [slot],
                        )
                        self.assertEqual(c.fetchone()[0], len(catalog))
                        c.execute(
                            "SELECT count(*) FROM cierreagenda WHERE fecha=%s AND cerrado",
                            [local.date()],
                        )
                        self.assertEqual(c.fetchone()[0], 0)
                    self.assertEqual(
                        [a[1] for a in appointments], [True, False, False, True]
                    )
                    c.execute(
                        "SELECT estado,version FROM programacionautologa WHERE referenciamedica='DEMO-C3-AUTO-04'"
                    )
                    self.assertEqual(c.fetchone(), ("PendienteRevision", 1))
                    c.execute(
                        "SELECT count(*) FROM programacionautologahistorial h JOIN programacionautologa a USING(idprograma) WHERE a.referenciamedica='DEMO-C3-AUTO-04'"
                    )
                    self.assertEqual(c.fetchone()[0], 1)
                    c.execute("SELECT count(*) FROM usuario")
                    self.assertEqual(c.fetchone()[0], users_before)
                    c.execute("SELECT count(*) FROM comprobantepago")
                    self.assertEqual(c.fetchone()[0], payments_before)
                    # Simular secuencia adelantada por intentos fallidos/rollback.
                    high = occupied + 1000
                    c.execute("SELECT setval(%s::regclass,%s,true)", [seq, high])
                    c.execute(script)
                    c.execute("SELECT count(*) FROM persona WHERE ci LIKE 'DEMO-C3-%'")
                    self.assertEqual(c.fetchone()[0], 6)
                    c.execute(
                        "SELECT count(*) FROM institucionsalud WHERE nombreinstitucion='DEMO C3 - Institución de pruebas'"
                    )
                    self.assertEqual(c.fetchone()[0], 1)
                    c.execute(
                        "SELECT count(*) FROM citadonacion c JOIN persona p USING(idpersona) WHERE p.ci LIKE 'DEMO-C3-%'"
                    )
                    self.assertEqual(c.fetchone()[0], 4)
                    c.execute(
                        "SELECT count(*) FROM detallesolicitud d JOIN solicitudhospitalaria s USING(idsolicitud) WHERE s.numerosolicitud LIKE 'DEMO-C3-%'"
                    )
                    self.assertEqual(c.fetchone()[0], 3)
                    c.execute(
                        "SELECT count(*),sum(montooriginal),sum(montoabonado) FROM deudafinanciera d JOIN solicitudhospitalaria s USING(idsolicitud) WHERE s.numerosolicitud LIKE 'DEMO-C3-%'"
                    )
                    self.assertEqual(c.fetchone(), (2, 300, 0))
                    # No reparar silenciosamente una cita de la versión anterior.
                    c.execute("SAVEPOINT antigua")
                    c.execute(
                        "UPDATE citadonacion SET idturno=NULL WHERE idcita=(SELECT c.idcita FROM citadonacion c JOIN persona p USING(idpersona) WHERE p.ci='DEMO-C3-P01' LIMIT 1)"
                    )
                    with self.assertRaisesRegex(
                        psycopg2.errors.RaiseException, "cita antigua incompleta"
                    ):
                        c.execute(script)
                    c.execute("ROLLBACK TO SAVEPOINT antigua")
                    from psycopg2 import sql

                    c.execute(
                        sql.SQL("SELECT last_value FROM {}").format(
                            sql.Identifier(*seq.split("."))
                        )
                    )
                    self.assertEqual(c.fetchone()[0], high)
            finally:
                # Nunca confirmar registros; setval sí persiste, solo en esta BD local.
                conn.rollback()


class PoblacionApiPostgresTests(unittest.TestCase):
    def test_datos_visibles_en_apis_de_agenda_autologas_y_finanzas(self):
        # Configura únicamente la BD local desechable, nunca el .env/Supabase.
        from tests_clinica_postgres import ClinicalTests
        from django.db import connection, transaction
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.agenda.views import Catalogo as Agenda, Programas
        from apps.finanzas.views import Catalogo as Finanzas

        ClinicalTests.setUp(self)
        script = (
            Path(__file__).resolve().parents[1]
            / "database"
            / "revision_poblacion"
            / "02_poblacion_demo_revision.sql"
        ).read_text(encoding="utf-8")
        script = script.replace("BEGIN;", "", 1).rsplit("ROLLBACK;", 1)[0]
        with transaction.atomic():
            with connection.cursor() as c:
                c.execute(
                    "INSERT INTO requisitodonacion(nombrerequisito,tiporequisito) VALUES('Requisito académico de prueba','Académico')"
                )
                c.execute(script)

            def get(view, role="ADMIN"):
                request = APIRequestFactory().get("/", {"q": "DEMO-C3-"})
                force_authenticate(request, user=self.user, token={"rolActivo": role})
                return view.as_view()(request)

            agenda = get(Agenda)
            self.assertEqual(agenda.status_code, 200, agenda.data)
            self.assertEqual(agenda.data["paginacion"]["total"], 4)
            self.assertEqual(agenda.data["personas_paginacion"]["total"], 6)
            self.assertTrue(
                all(
                    c["respuestas"] and c["requisitos_registrados"]
                    for c in agenda.data["citas"]
                )
            )
            programs = get(Programas)
            self.assertEqual(programs.status_code, 200, programs.data)
            self.assertEqual(len(programs.data["programas"]), 1)
            self.assertEqual(
                programs.data["programas"][0]["estado"], "PendienteRevision"
            )
            finance = get(Finanzas)
            self.assertEqual(finance.status_code, 200, finance.data)
            self.assertEqual(len(finance.data["deudas"]), 2)
            self.assertEqual(
                sum(d["saldopendiente"] for d in finance.data["deudas"]), 300
            )
            self.assertEqual(finance.data["pagos"], [])
            self.assertEqual(finance.data["comprobantes"], [])
            self.assertEqual(get(Finanzas, "TEC_LOGISTICA").status_code, 403)
            # También el motor de consultas dinámicas debe sumar la cartera DEMO.
            # Las pruebas de CU24 existentes validan su contrato; aquí verificamos
            # la vista SQL financiera que alimenta el catálogo y los reportes.
            with connection.cursor() as c:
                c.execute(
                    "SELECT sum(v.saldopendiente) FROM vw_cu22_cuentas_por_cobrar v JOIN solicitudhospitalaria s USING(idsolicitud) WHERE s.numerosolicitud LIKE 'DEMO-C3-%'"
                )
                self.assertEqual(c.fetchone()[0], 300)
            transaction.set_rollback(True)
