"""Solo BD desechable local definida por tests_liberacion_postgres; nunca Supabase."""

import unittest
from concurrent.futures import ThreadPoolExecutor
from tests_liberacion_postgres import LiberacionPostgresTests
from django.db import connection, connections
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.clinica.views import (
    TriajeView,
    DiferimientoView,
    ColectaView,
    FraccionamientoView,
    CustodiaView,
    BajaView,
    AdmisionView,
    Operations,
)
from apps.laboratorio.views import AnalisisView, LiberarView


class ClinicalTests(unittest.TestCase):
    def setUp(self):
        LiberacionPostgresTests.setUp(self)
        with connection.cursor() as c:
            for role in ["ADMIN", "DOC_TRIAJE", "PERS_COLECTA", "TEC_LOGISTICA"]:
                c.execute(
                    "INSERT INTO rol(codigorol,nombrerol) VALUES(%s,%s) RETURNING idrol",
                    [role, role],
                )
                rid = c.fetchone()[0]
                c.execute(
                    "INSERT INTO usuariorol(idusuario,idrol) VALUES(%s,%s)",
                    [self.uid, rid],
                )
            c.execute(
                "INSERT INTO persona(ci,nombres,apellidos,sexo,fechanacimiento) VALUES('PATIENT','Paciente','Prueba','M','1990-01-01') RETURNING idpersona"
            )
            self.pid = c.fetchone()[0]
            c.execute("INSERT INTO posibledonador(idpersona) VALUES(%s)", [self.pid])
            c.execute(
                "INSERT INTO citadonacion(idpersona,fechahoraprogramada,prefiltroaprobado,asistenciaconfirmada) VALUES(%s,CURRENT_TIMESTAMP,true,true) RETURNING idcita",
                [self.pid],
            )
            self.app = c.fetchone()[0]
            c.execute(
                "INSERT INTO ubicacionalmacen(identificadorcompartimento,tipoequipo,temperaturaregistro,capacidadmaxima) VALUES('TEST','Refrigerador',4,5) RETURNING idubicacion"
            )
            self.loc = c.fetchone()[0]
            c.execute("INSERT INTO protocoloconservacion(tipocomponente,temperaturamin,temperaturamax,diasconservacion,aprobadopor) VALUES('Concentrado de Globulos Rojos',2,6,35,%s)",[self.person])
        self.vitals = dict(
            idpersona=self.pid,
            idcita=self.app,
            pesokg=70,
            presionsistolicammhg=120,
            presiondiastolicammhg=80,
            nivelhemoglobina=14,
            temperatura=36.5,
            resultadoaptitud="Apto",
        )

    def call(self, view, data=None, role="ADMIN", **kwargs):
        r = APIRequestFactory().post("/", data or {}, format="json")
        force_authenticate(r, user=self.user, token={"rolActivo": role})
        return view.as_view()(r, **kwargs)

    def triage(self):
        r = self.call(TriajeView, self.vitals)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["idtriaje"]

    def collect(self, t=None):
        d = dict(
            idtriaje=t or self.triage(),
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=True,
            firmadigital="Firma sintética local",
        )
        r = self.call(ColectaView, d)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data

    def fraction(self, m):
        d = {
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
        r = self.call(FraccionamientoView, d, madre=m)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data, d

    def test_complete_circuit_to_joint_release_and_custody(self):
        m = self.collect()["idunidadmadre"]
        parts, _ = self.fraction(m)
        for tipo, d in [("serologia", self.sero), ("hematologia", self.hema)]:
            r = self.call(AnalisisView, d, madre=m, tipo=tipo)
            self.assertEqual(r.status_code, 201, r.data)
        r = self.call(LiberarView, madre=m)
        self.assertEqual(r.status_code, 200, r.data)
        bag = parts["componentes"][0]
        r = self.call(CustodiaView, {"idubicacion": self.loc}, bolsa=bag)
        self.assertEqual(r.status_code, 201, r.data)
        with connection.cursor() as c:
            c.execute(
                "SELECT estadobolsak FROM ejemplarbolsa WHERE idejemplarbolsa=%s", [bag]
            )
            self.assertEqual(c.fetchone()[0], "Disponible")
            c.execute(
                "SELECT count(*) FROM bitacoraauditoria WHERE tablaafectada='unidadsangretotal' AND idregistroafectado=%s AND accionrealizada LIKE 'INSERT%%'",
                [m],
            )
            self.assertEqual(c.fetchone()[0], 1)

    def test_vitals_admission_identity_and_permissions(self):
        for data in [
            dict(self.vitals, pesokg=40),
            dict(self.vitals, presiondiastolicammhg=160),
            dict(self.vitals, idpersona=self.person),
        ]:
            self.assertIn(self.call(TriajeView, data).status_code, [400, 404])
        self.assertEqual(
            self.call(TriajeView, self.vitals, role="PERS_COLECTA").status_code, 403
        )
        with connection.cursor() as c:
            c.execute(
                "UPDATE citadonacion SET asistenciaconfirmada=false WHERE idcita=%s",
                [self.app],
            )
        self.assertEqual(self.call(TriajeView, self.vitals).status_code, 400)
        self.assertEqual(
            self.call(
                AdmisionView, dict(idcita=self.app, idpersona=self.pid)
            ).status_code,
            201,
        )
        self.triage()
        self.assertEqual(self.call(TriajeView, self.vitals).status_code, 400)

    def test_temporal_over_year_not_definitive_and_agenda(self):
        t = self.triage()
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO donante(idpersona,carnetdigitalcodigo,tipodonante) VALUES(%s,'DON-LOCAL','Voluntario Altruista')",
                [self.pid],
            )
            c.execute(
                "INSERT INTO citadonacion(idpersona,fechahoraprogramada) VALUES(%s,CURRENT_TIMESTAMP+interval '1 day')",
                [self.pid],
            )
        d = dict(
            idpersona=self.pid,
            idtriaje=t,
            tipo="Temporal",
            diasinhabilitacion=500,
            motivodetallado="Restricción temporal de prueba",
        )
        r = self.call(DiferimientoView, d)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(len(r.data["citas_canceladas"]), 1)
        self.assertEqual(self.call(DiferimientoView, d).status_code, 400)
        self.assertEqual(
            self.call(
                ColectaView,
                dict(
                    idtriaje=t,
                    idgrupo=self.group,
                    brazoextraccion="Derecho",
                    volumenextraidoml=450,
                    declaracionjuradaaceptada=True,
                    firmadigital="test",
                ),
            ).status_code,
            400,
        )
        with connection.cursor() as c:
            c.execute(
                "SELECT estadohabilitacion FROM donante WHERE idpersona=%s", [self.pid]
            )
            self.assertEqual(c.fetchone()[0], "Diferido Temporal")
            c.execute("SELECT estado FROM usuario WHERE idusuario=%s", [self.uid])
            self.assertEqual(c.fetchone()[0], "Activo")

    def test_definitive_explicit_no_end_date(self):
        t = self.triage()
        d = dict(
            idpersona=self.pid,
            idtriaje=t,
            tipo="Definitivo",
            diasinhabilitacion=0,
            motivodetallado="Dictamen definitivo de prueba",
        )
        r = self.call(DiferimientoView, d)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIsNone(r.data["fechafindiferimiento"])

    def test_consent_required_and_duplicate_collection(self):
        t = self.triage()
        d = dict(
            idtriaje=t,
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=False,
            firmadigital="test",
        )
        self.assertEqual(self.call(ColectaView, d).status_code, 400)
        m = self.collect(t)
        d["declaracionjuradaaceptada"] = True
        self.assertEqual(self.call(ColectaView, d).status_code, 400)
        with connection.cursor() as c:
            c.execute(
                "SELECT count(*) FROM consentimientoinformado WHERE idextraccion=%s",
                [m["idextraccion"]],
            )
            self.assertEqual(c.fetchone()[0], 1)

    def test_fraction_balance_capacity_duplicate_and_rollback(self):
        m = self.collect()["idunidadmadre"]
        d = {
            "componentes": [
                dict(
                    tipocomponente="Concentrado de Globulos Rojos",
                    volumenml=500,
                    capacidadbolsaml=550,
                    idubicacion=self.loc,
                    categoriaetaria="Adulto",
                )
            ]
        }
        self.assertEqual(self.call(FraccionamientoView, d, madre=m).status_code, 400)
        with connection.cursor() as c:
            c.execute(
                "UPDATE ubicacionalmacen SET capacidadmaxima=0 WHERE idubicacion=%s",
                [self.loc],
            )
        d["componentes"][0]["volumenml"] = 250
        self.assertEqual(self.call(FraccionamientoView, d, madre=m).status_code, 400)
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM ejemplarbolsa WHERE idunidadmadre=%s", [m])
            self.assertEqual(c.fetchone()[0], 0)
            c.execute(
                "UPDATE ubicacionalmacen SET capacidadmaxima=5 WHERE idubicacion=%s",
                [self.loc],
            )
        self.fraction(m)
        self.assertEqual(self.call(FraccionamientoView, d, madre=m).status_code, 400)

    def test_baja_and_counter(self):
        m = self.collect()["idunidadmadre"]
        parts, _ = self.fraction(m)
        bag = parts["componentes"][0]
        self.assertEqual(
            self.call(
                BajaView, {"motivobaja": "Daño de prueba"}, bolsa=bag
            ).status_code,
            201,
        )
        self.assertEqual(
            self.call(
                BajaView, {"motivobaja": "Daño de prueba"}, bolsa=bag
            ).status_code,
            400,
        )
        with connection.cursor() as c:
            c.execute(
                "SELECT capacidadocupada FROM ubicacionalmacen WHERE idubicacion=%s",
                [self.loc],
            )
            self.assertEqual(c.fetchone()[0], 0)

    def test_concurrent_collection_single_success(self):
        t = self.triage()
        d = dict(
            idtriaje=t,
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=True,
            firmadigital="test",
        )

        def run(_):
            try:
                return self.call(ColectaView, d).status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run, range(2)))
        self.assertEqual(sorted(results), [201, 400])

    def test_real_jwt_profile_selection(self):
        from rest_framework.test import APIClient
        from apps.seguridad.utils import generate_tokens_for_usuario

        client = APIClient(HTTP_HOST="localhost")
        client.credentials(
            HTTP_AUTHORIZATION="Bearer "
            + generate_tokens_for_usuario(self.user, "BIOQ_INTEGRAL")["access"]
        )
        denied = client.post(
            "/api/clinica/perfil/", {"rolActivo": "ROLE_NOT_ASSIGNED"}, format="json"
        )
        self.assertEqual(denied.status_code, 403)
        selected = client.post(
            "/api/clinica/perfil/", {"rolActivo": "DOC_TRIAJE"}, format="json"
        )
        self.assertEqual(selected.status_code, 200, selected.data)
        client.credentials(HTTP_AUTHORIZATION="Bearer " + selected.data["access"])
        r = client.post("/api/clinica/triajes/", self.vitals, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        r = client.post("/api/clinica/colectas/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_missing_migration_prevents_write(self):
        with connection.cursor() as c:
            c.execute(
                "ALTER FUNCTION hemo_lote_aprobado(integer) RENAME TO hemo_lote_aprobado_test_hidden"
            )
        try:
            r = self.call(TriajeView, self.vitals)
            self.assertEqual(r.status_code, 503, r.data)
            with connection.cursor() as c:
                c.execute(
                    "SELECT count(*) FROM triajeclinico WHERE idposibledonador=%s",
                    [self.pid],
                )
                self.assertEqual(c.fetchone()[0], 0)
        finally:
            with connection.cursor() as c:
                c.execute(
                    "ALTER FUNCTION hemo_lote_aprobado_test_hidden(integer) RENAME TO hemo_lote_aprobado"
                )

    def test_expired_triage_and_fraction_deadline(self):
        t = self.triage()
        with connection.cursor() as c:
            c.execute(
                "UPDATE triajeclinico SET fechahora=CURRENT_TIMESTAMP-interval '1 day' WHERE idtriaje=%s",
                [t],
            )
        d = dict(
            idtriaje=t,
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=True,
            firmadigital="test",
        )
        self.assertEqual(self.call(ColectaView, d).status_code, 400)
        with connection.cursor() as c:
            c.execute(
                "UPDATE triajeclinico SET fechahora=CURRENT_TIMESTAMP WHERE idtriaje=%s",
                [t],
            )
        m = self.collect(t)
        with connection.cursor() as c:
            c.execute(
                "UPDATE extracciondonacion SET fechahora=CURRENT_TIMESTAMP-interval '9 hours' WHERE idextraccion=%s",
                [m["idextraccion"]],
            )
        parts = {
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
        self.assertEqual(
            self.call(FraccionamientoView, parts, madre=m["idunidadmadre"]).status_code,
            400,
        )

    def test_provisional_triage_boundaries_are_explicit(self):
        # Caracteriza restricciones existentes; no acredita aprobación médica.
        from apps.clinica.serializers import Triaje

        boundary = dict(self.vitals, pesokg=50, nivelhemoglobina=12.5, temperatura=37.5)
        self.assertTrue(Triaje(data=boundary).is_valid())
        for change in [dict(pesokg=49.99), dict(nivelhemoglobina=12.4), dict(temperatura=37.6)]:
            with self.subTest(change=change):
                self.assertFalse(Triaje(data=dict(boundary, **change)).is_valid())
                # Un rechazo profesional sí se registra para continuar por CU11.
                self.assertTrue(Triaje(data=dict(boundary, **change, resultadoaptitud="Rechazado")).is_valid())

    def test_fraction_uses_approved_protocol_days_temperature_and_agitation(self):
        from apps.clinica.views import ProtocoloView

        m = self.collect()["idunidadmadre"]
        d = {"componentes": [dict(tipocomponente="Concentrado de Globulos Rojos",
             volumenml=250, capacidadbolsaml=350, idubicacion=self.loc, categoriaetaria="Adulto")]}
        with connection.cursor() as c:
            c.execute("DELETE FROM protocoloconservacion")
        self.assertEqual(self.call(FraccionamientoView, d, madre=m).status_code, 400)
        # Valores sintéticos deliberadamente distintos de los 35 días heredados.
        protocol = dict(tipocomponente="Concentrado de Globulos Rojos", temperaturamin=2,
                        temperaturamax=6, diasconservacion=7, requiereagitacion=True)
        self.assertEqual(self.call(ProtocoloView, protocol, role="TEC_LOGISTICA").status_code, 403)
        self.assertEqual(self.call(ProtocoloView, protocol).status_code, 201)
        for temperature, agitation in [(1.9, True), (6.1, True), (4, False)]:
            with self.subTest(temperature=temperature, agitation=agitation):
                with connection.cursor() as c:
                    c.execute("UPDATE ubicacionalmacen SET temperaturaregistro=%s,tieneagitacion=%s WHERE idubicacion=%s",
                              [temperature, agitation, self.loc])
                self.assertEqual(self.call(FraccionamientoView, d, madre=m).status_code, 400)
        with connection.cursor() as c:
            c.execute("UPDATE ubicacionalmacen SET temperaturaregistro=4,tieneagitacion=true WHERE idubicacion=%s", [self.loc])
        self.assertEqual(self.call(FraccionamientoView, d, madre=m).status_code, 201)
        with connection.cursor() as c:
            c.execute("SELECT fechacaducidad-fechaextraccion FROM ejemplarbolsa WHERE idunidadmadre=%s", [m])
            self.assertEqual(c.fetchone()[0], 7)
            c.execute("SELECT aprobadopor FROM protocoloconservacion")
            self.assertEqual(c.fetchone()[0], self.person)

    def test_missing_second_protocol_rolls_back_entire_fraction(self):
        m = self.collect()["idunidadmadre"]
        base = dict(volumenml=150, capacidadbolsaml=350, idubicacion=self.loc, categoriaetaria="Adulto")
        d = {"componentes": [dict(base, tipocomponente="Concentrado de Globulos Rojos", volumenml=250),
                             dict(base, tipocomponente="Plasma Fresco Congelado")]}
        response = self.call(FraccionamientoView, d, madre=m)
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("aprobar un protocolo", str(response.data))
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM ejemplarbolsa WHERE idunidadmadre=%s", [m])
            self.assertEqual(c.fetchone()[0], 0)
            c.execute("SELECT capacidadocupada FROM ubicacionalmacen WHERE idubicacion=%s", [self.loc])
            self.assertEqual(c.fetchone()[0], 0)

    def test_active_clinical_circuit_does_not_invoke_legacy_procedures(self):
        legacy = ("sp_procesar_triaje_clinico", "sp_registrar_flebotomia", "sp_registrar_fraccionamiento")

        def guard(execute, sql, params, many, context):
            self.assertFalse(any(name in sql.lower() for name in legacy), sql)
            return execute(sql, params, many, context)

        with connection.execute_wrapper(guard):
            t = self.triage()
            m = self.collect(t)["idunidadmadre"]
            self.fraction(m)
            r = self.call(DiferimientoView, dict(idpersona=self.pid, idtriaje=t,
                          tipo="Temporal", diasinhabilitacion=500, motivodetallado="Prueba de contrato explícito"))
            self.assertEqual(r.status_code, 201, r.data)

    def test_autologous_general_fraction_blocked(self):
        m = self.collect()["idunidadmadre"]
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO donante(idpersona,carnetdigitalcodigo,tipodonante) VALUES(%s,'AUTO-TEST','Autologo')",
                [self.pid],
            )
        parts = {
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
        self.assertEqual(
            self.call(FraccionamientoView, parts, madre=m).status_code, 400
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
