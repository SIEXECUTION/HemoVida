"""Cierre académico: solo PostgreSQL local desechable, nunca Supabase."""

import unittest
from contextlib import contextmanager
from datetime import date, timedelta
from pathlib import Path
from tests_clinica_postgres import ClinicalTests
from django.db import connection, transaction, DatabaseError
from apps.clinica.views import (
    DiferimientoView,
    ProtocoloView,
    ColectaView,
    TriajeView,
    FraccionamientoView,
)
from apps.laboratorio.views import AnalisisView, LiberarView
from apps.reportes.views import Consulta
from rest_framework.test import APIRequestFactory, force_authenticate


class AcademicClosureTests(unittest.TestCase):
    setUp = ClinicalTests.setUp
    call = ClinicalTests.call
    triage = ClinicalTests.triage
    collect = ClinicalTests.collect
    fraction = ClinicalTests.fraction

    @contextmanager
    def calendar(self, day):
        # La sustitución del reloj y todas las escrituras del caso se revierten.
        with transaction.atomic():
            with connection.cursor() as c:
                c.execute(
                    "CREATE OR REPLACE FUNCTION public.hemo_dia_clinico(p_instante timestamptz DEFAULT CURRENT_TIMESTAMP) RETURNS date LANGUAGE sql STABLE SET search_path=public,pg_temp AS $$ SELECT %s::date $$",
                    [day],
                )
            try:
                yield
            finally:
                transaction.set_rollback(True)

    def approve(self, mother=None):
        mother = mother or self.madre
        for kind, payload in [("serologia", self.sero), ("hematologia", self.hema)]:
            r = self.call(AnalisisView, payload, madre=mother, tipo=kind)
            self.assertEqual(r.status_code, 201, r.data)

    def test_database_calendar_agrees_across_utc_midnight(self):
        with connection.cursor() as c:
            for stamp, expected in [
                ("2026-11-01 02:00:00+00", date(2026, 10, 31)),
                ("2026-11-01 05:00:00+00", date(2026, 11, 1)),
            ]:
                c.execute(
                    "SELECT hemo_dia_clinico(%s::timestamptz),hemo_fecha_clinica(%s::timestamp)",
                    [stamp, stamp[:19]],
                )
                self.assertEqual(c.fetchone(), (expected, expected))

    def test_triage_in_previous_utc_day_is_valid_in_same_bolivia_day(self):
        with self.calendar("2026-10-31"):
            t = self.triage()
            with connection.cursor() as c:
                c.execute(
                    "UPDATE triajeclinico SET fechahora='2026-10-31 23:30:00' WHERE idtriaje=%s",
                    [t],
                )
            self.collect(t)

    def test_same_utc_day_does_not_accept_prior_local_triage(self):
        with self.calendar("2026-11-01"):
            t = self.triage()
            with connection.cursor() as c:
                c.execute(
                    "UPDATE triajeclinico SET fechahora='2026-11-01 02:00:00' WHERE idtriaje=%s",
                    [t],
                )
            r = self.call(
                ColectaView,
                dict(
                    idtriaje=t,
                    idgrupo=self.group,
                    brazoextraccion="Derecho",
                    volumenextraidoml=450,
                    declaracionjuradaaceptada=True,
                    firmadigital="Prueba",
                ),
            )
            self.assertEqual(r.status_code, 400, r.data)

    def test_fraction_dates_are_local_and_not_raw_utc_dates(self):
        with self.calendar("2026-10-31"):
            t = self.triage()
            with connection.cursor() as c:
                c.execute(
                    "UPDATE triajeclinico SET fechahora='2026-11-01 02:00:00' WHERE idtriaje=%s",
                    [t],
                )
            m = self.collect(t)["idunidadmadre"]
            with connection.cursor() as c:
                c.execute(
                    "UPDATE extracciondonacion SET fechahora='2026-11-01 02:00:00' WHERE idextraccion=(SELECT idextraccion FROM unidadsangretotal WHERE idunidadmadre=%s)",
                    [m],
                )

            def clock(execute, sql, params, many, context):
                if sql.startswith(
                    "SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' BETWEEN"
                ):
                    sql = sql.replace(
                        "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'", "%s::timestamp"
                    )
                    params = ["2026-11-01 03:00:00", *params]
                return execute(sql, params, many, context)

            with connection.execute_wrapper(clock):
                self.fraction(m)
            with connection.cursor() as c:
                c.execute(
                    "SELECT fechaextraccion,fechacaducidad FROM ejemplarbolsa WHERE idunidadmadre=%s",
                    [m],
                )
                self.assertEqual(
                    c.fetchone(),
                    (date(2026, 10, 31), date(2026, 10, 31) + timedelta(days=35)),
                )

    def test_future_extraction_is_not_fractioned(self):
        m = self.collect()["idunidadmadre"]
        with connection.cursor() as c:
            c.execute(
                "UPDATE extracciondonacion SET fechahora=CURRENT_TIMESTAMP+interval '1 hour' WHERE idextraccion=(SELECT idextraccion FROM unidadsangretotal WHERE idunidadmadre=%s)",
                [m],
            )
        data = {
            "componentes": [
                dict(
                    tipocomponente="Concentrado de Globulos Rojos",
                    volumenml=250,
                    capacidadbolsaml=350,
                    idubicacion=self.loc,
                    categoriaetaria="Adulto",
                )
            ]
        }
        self.assertEqual(self.call(FraccionamientoView, data, madre=m).status_code, 400)

    def test_reservations_and_trigger_use_same_local_expiry_day(self):
        self.approve()
        with self.calendar("2026-10-31"):
            with connection.cursor() as c:
                c.execute(
                    "UPDATE ejemplarbolsa SET fechaextraccion='2026-10-30',fechacaducidad='2026-10-31' WHERE idejemplarbolsa=%s",
                    [self.component],
                )
            self.assertEqual(self.call(LiberarView, madre=self.madre).status_code, 403)
            r = self.call(LiberarView, madre=self.madre, role="BIOQ_INTEGRAL")
            self.assertEqual(r.status_code, 200, r.data)
            with connection.cursor() as c:
                c.execute(
                    "SELECT estadobolsak FROM ejemplarbolsa WHERE idejemplarbolsa=%s",
                    [self.component],
                )
                self.assertEqual(c.fetchone()[0], "Disponible")

    def test_deferral_cancels_until_last_local_day_including_utc_next_day(self):
        t = self.triage()
        with connection.cursor() as c:
            c.execute("SELECT hemo_dia_clinico()")
            last = c.fetchone()[0] + timedelta(days=1)
            next_utc_day = (last + timedelta(days=1)).isoformat()
            c.execute(
                "INSERT INTO citadonacion(idpersona,fechahoraprogramada) VALUES(%s,%s::date+time '03:59:00'),(%s,%s::date+time '04:00:00') RETURNING idcita",
                [self.pid, next_utc_day, self.pid, next_utc_day],
            )
            inside, outside = [r[0] for r in c.fetchall()]
        r = self.call(
            DiferimientoView,
            dict(
                idpersona=self.pid,
                idtriaje=t,
                tipo="Temporal",
                diasinhabilitacion=1,
                motivodetallado="Restricción académica de prueba",
            ),
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn(inside, r.data["citas_canceladas"])
        self.assertNotIn(outside, r.data["citas_canceladas"])

    def test_academic_bounds_and_logistics_permission(self):
        self.assertEqual(
            self.call(TriajeView, dict(self.vitals, pesokg=50)).status_code, 400
        )
        with connection.cursor() as c:
            c.execute(
                "UPDATE persona SET fechanacimiento=hemo_dia_clinico()-interval '16 years' WHERE idpersona=%s",
                [self.pid],
            )
        self.assertEqual(self.call(TriajeView, self.vitals).status_code, 400)
        d = dict(
            idtriaje=1,
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=451,
            declaracionjuradaaceptada=True,
            firmadigital="Prueba",
        )
        self.assertEqual(self.call(ColectaView, d).status_code, 400)
        p = dict(
            tipocomponente="Concentrado Plaquetario",
            temperaturamin=20,
            temperaturamax=24,
            diasconservacion=5,
            requiereagitacion=True,
            referencia="Parámetro académico autorizado",
        )
        r = self.call(ProtocoloView, p, role="TEC_LOGISTICA")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["contexto"], "Academico")

    def test_legacy_execute_is_denied_to_nonadministrative_role(self):
        with transaction.atomic():
            try:
                with connection.cursor() as c:
                    c.execute("CREATE ROLE hemo_cierre_probe NOLOGIN")
                    c.execute(
                        "SELECT has_function_privilege('hemo_cierre_probe',p.oid,'EXECUTE') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('sp_procesar_triaje_clinico','sp_registrar_flebotomia','sp_registrar_fraccionamiento')"
                    )
                    self.assertEqual(c.fetchall(), [(False,), (False,), (False,)])
                    c.execute("SET LOCAL ROLE hemo_cierre_probe")
                with self.assertRaises(DatabaseError) as error, transaction.atomic():
                    with connection.cursor() as c:
                        c.execute(
                            "CALL public.sp_registrar_flebotomia(%s,%s,%s,%s,%s,NULL)",
                            [self.person, self.person, self.group, "Derecho", 450],
                        )
                self.assertIn("permission denied for procedure", str(error.exception))
            finally:
                transaction.set_rollback(True)

    def test_seed_academic_protocols_is_idempotent_and_preserves_changes(self):
        script = (
            Path(__file__).parent.parent
            / "database/10_cierre_academico_y_calendario.sql"
        ).read_text(encoding="utf-8")
        with connection.cursor() as c:
            c.execute(script)
            c.execute(
                "SELECT temperaturamin,temperaturamax,diasconservacion,requiereagitacion FROM protocoloconservacion WHERE tipocomponente='Concentrado Plaquetario'"
            )
            self.assertEqual(tuple(c.fetchone()), (20, 24, 5, True))
            c.execute(
                "UPDATE protocoloconservacion SET diasconservacion=7 WHERE tipocomponente='Plasma Fresco Congelado'"
            )
            c.execute(script)
            c.execute(
                "SELECT diasconservacion FROM protocoloconservacion WHERE tipocomponente='Plasma Fresco Congelado'"
            )
            self.assertEqual(c.fetchone()[0], 7)
            c.execute("SELECT count(*) FROM protocoloconservacion")
            self.assertEqual(c.fetchone()[0], 6)

    def test_stock_excludes_legacy_available_without_joint_approval(self):
        # Escenario de importación anterior a 06; no se cambia el dato para ocultarlo.
        with connection.cursor() as c:
            c.execute(
                "ALTER TABLE ejemplarbolsa DISABLE TRIGGER trg_hemo_liberacion_componente"
            )
            try:
                c.execute(
                    "UPDATE ejemplarbolsa SET estadobolsak='Disponible' WHERE idejemplarbolsa=%s",
                    [self.component],
                )
            finally:
                c.execute(
                    "ALTER TABLE ejemplarbolsa ENABLE TRIGGER trg_hemo_liberacion_componente"
                )
        request = APIRequestFactory().get(
            "/", {"fuente": "stock", "dimension": "componente"}
        )
        force_authenticate(request, user=self.user, token={"rolActivo": "ADMIN"})
        r = Consulta.as_view()(request)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["totales"]["cantidad"], 0)
        from apps.inventario.views import StockAlertasListView

        with connection.cursor() as c:
            c.execute(
                "INSERT INTO parametrostockminimo(idgrupo,tipocomponente,stockminimoseguridad,stockcriticoalerta) VALUES(%s,'Concentrado de Globulos Rojos',2,1)",
                [self.group],
            )

        def stock():
            req = APIRequestFactory().get("/", {"todos": "true"})
            force_authenticate(req, user=self.user, token={"rolActivo": "ADMIN"})
            return StockAlertasListView.as_view()(req)

        current = stock()
        self.assertEqual(current.status_code, 200, current.data)
        self.assertEqual(current.data["alertas"][0]["stockDisponibleActual"], 0)
        self.approve()
        self.assertEqual(
            self.call(LiberarView, madre=self.madre, role="BIOQ_INTEGRAL").status_code,
            200,
        )
        self.assertEqual(stock().data["alertas"][0]["stockDisponibleActual"], 1)
