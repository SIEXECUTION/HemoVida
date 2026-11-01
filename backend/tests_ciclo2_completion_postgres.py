"""CU21/CU23 y ajustes: solo la base desechable local de los tests anteriores."""

import json
import unittest
from datetime import timedelta
from unittest.mock import patch

from tests_agenda_postgres import AgendaTests
from tests_clinica_postgres import ClinicalTests
from django.db import connection
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.agenda import views
from apps.clinica.views import ColectaView, ReactivarAutologaView
from apps.laboratorio.views import AnalisisView, LiberarView
from apps.reportes.static_views import CatalogoEstatico, InformeEstatico
from apps.seguridad.views import AutoRegistroPosibleDonadorView
from apps.seguridad.models import Usuario


class Cycle2CompletionTests(unittest.TestCase):
    call = ClinicalTests.call
    triage = ClinicalTests.triage
    fraction = ClinicalTests.fraction
    donor_request = AgendaTests.donor_request
    book = AgendaTests.book

    def setUp(self):
        AgendaTests.setUp(self)
        self.surgery = self.day + timedelta(days=10)
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO rol(codigorol,nombrerol) VALUES('MED_SOLICITANTE','Médico solicitante') RETURNING idrol"
            )
            c.execute(
                "INSERT INTO usuariorol(idusuario,idrol) VALUES(%s,%s)",
                [self.uid, c.fetchone()[0]],
            )
            c.execute(
                "INSERT INTO receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor,idgrupo) VALUES(%s,'AUTO-TEST','O Positivo',%s)",
                [self.pid, self.group],
            )

    def get(self, view, params=None, role="ADMIN"):
        req = APIRequestFactory().get("/", params or {})
        force_authenticate(req, user=self.user, token={"rolActivo": role})
        return view.as_view()(req)

    def program(self, approve=True):
        r = self.call(
            views.CrearPrograma,
            dict(
                idreceptor=self.pid,
                fechacirugia=self.surgery.isoformat(),
                indicacion="Indicación sintética para prueba local",
                referenciamedica="ORD-TEST",
            ),
            role="MED_SOLICITANTE",
        )
        self.assertEqual(r.status_code, 201, r.data)
        p = r.data
        if approve:
            p = self.revise(p, "Aprobar")
        return p

    def revise(self, p, action, role="BIOQ_INTEGRAL", **fields):
        r = self.call(
            views.RevisarPrograma,
            dict(
                version=p["version"],
                accion=action,
                confirmada=True,
                motivo="Revisión profesional sintética",
                **fields,
            ),
            role=role,
            ident=p["idprograma"],
        )
        self.assertEqual(r.status_code, 201, r.data)
        return r.data

    def lot(self, p):
        d = dict(
            idtriaje=self.triage(),
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=True,
            firmadigital="Prueba",
            autologa=True,
            idprograma=p["idprograma"],
            fechacirugia=self.surgery.isoformat(),
        )
        r = self.call(ColectaView, d)
        self.assertEqual(r.status_code, 201, r.data)
        mid = r.data["idunidadmadre"]
        self.fraction(mid)
        for kind, payload in [("serologia", self.sero), ("hematologia", self.hema)]:
            self.assertEqual(
                self.call(AnalisisView, payload, madre=mid, tipo=kind).status_code, 201
            )
        self.assertEqual(self.call(LiberarView, madre=mid, role="BIOQ_INTEGRAL").status_code, 200)
        return mid, d

    def test_program_roles_confirmation_version_and_patient_agenda(self):
        p = self.program(False)
        self.assertEqual(
            self.call(
                views.Citas,
                dict(self.payload, tipoatencion="Autologa", idprograma=p["idprograma"]),
            ).status_code,
            400,
        )
        self.assertEqual(
            self.call(
                views.RevisarPrograma,
                dict(
                    version=1,
                    accion="Aprobar",
                    motivo="Revisión de prueba",
                    confirmada=True,
                ),
                ident=p["idprograma"],
            ).status_code,
            403,
        )
        self.assertEqual(
            self.call(
                views.RevisarPrograma,
                dict(version=1, accion="Aprobar", motivo="Revisión de prueba"),
                ident=p["idprograma"],
                role="BIOQ_INTEGRAL",
            ).status_code,
            400,
        )
        p = self.revise(p, "Aprobar")
        ident = self.book(tipoatencion="Autologa", idprograma=p["idprograma"])
        self.assertEqual(
            self.call(
                views.RevisarPrograma,
                dict(
                    version=1,
                    accion="Cancelar",
                    motivo="Revisión de prueba",
                    confirmada=True,
                ),
                ident=p["idprograma"],
                role="BIOQ_INTEGRAL",
            ).status_code,
            400,
        )
        self.revise(
            p,
            "Modificar",
            role="MED_SOLICITANTE",
            fechacirugia=(self.surgery + timedelta(days=1)).isoformat(),
            indicacion="Indicación médica actualizada",
            referenciamedica="ORD-NEW",
        )
        with connection.cursor() as c:
            c.execute(
                "SELECT estadocita,idprograma FROM citadonacion WHERE idcita=%s",
                [ident],
            )
            self.assertEqual(c.fetchone(), ("Cancelada", p["idprograma"]))
            c.execute(
                "SELECT estadoaptitud FROM posibledonador WHERE idpersona=%s",
                [self.pid],
            )
            self.assertEqual(c.fetchone()[0], "No Apto")

    def test_surgery_change_quarantines_then_requires_review_reserve_and_release(self):
        p = self.program()
        mid, _ = self.lot(p)
        changed = self.revise(
            p,
            "Modificar",
            role="MED_SOLICITANTE",
            fechacirugia=(self.surgery + timedelta(days=2)).isoformat(),
            indicacion="Cambio médico de fecha quirúrgica",
            referenciamedica="ORD-NEW",
        )
        with connection.cursor() as c:
            c.execute(
                "SELECT estadobolsak,esexclusivoautologo FROM ejemplarbolsa WHERE idunidadmadre=%s",
                [mid],
            )
            self.assertEqual(c.fetchone(), ("En Cuarentena", True))
            c.execute(
                "SELECT estadoreserva FROM reservasangre WHERE idejemplarbolsa IN (SELECT idejemplarbolsa FROM ejemplarbolsa WHERE idunidadmadre=%s)",
                [mid],
            )
            self.assertEqual(c.fetchone()[0], "Cancelada")
        self.assertEqual(self.call(LiberarView, madre=mid, role="BIOQ_INTEGRAL").status_code, 400)
        approved = self.revise(changed, "Aprobar")
        self.assertEqual(self.call(LiberarView, madre=mid, role="BIOQ_INTEGRAL").status_code, 400)
        self.assertEqual(
            self.call(
                ReactivarAutologaView, dict(confirmada=True), madre=mid
            ).status_code,
            201,
        )
        self.assertEqual(self.call(LiberarView, madre=mid, role="BIOQ_INTEGRAL").status_code, 200)
        with connection.cursor() as c:
            c.execute(
                "SELECT fechacirugia,idprograma FROM colectaautologa WHERE idunidadmadre=%s",
                [mid],
            )
            self.assertEqual(
                c.fetchone(), (self.surgery + timedelta(days=2), p["idprograma"])
            )
            c.execute(
                "SELECT count(*) FROM programacionautologahistorial WHERE idprograma=%s",
                [p["idprograma"]],
            )
            self.assertEqual(c.fetchone()[0], 4)

    def test_cancel_preserves_exclusivity_and_blocks_reactivation(self):
        p = self.program()
        mid, _ = self.lot(p)
        self.revise(p, "Cancelar")
        self.assertEqual(
            self.call(
                ReactivarAutologaView, dict(confirmada=True), madre=mid
            ).status_code,
            400,
        )
        with connection.cursor() as c:
            c.execute(
                "SELECT count(*) FROM ejemplarbolsa WHERE idunidadmadre=%s AND (NOT esexclusivoautologo OR estadobolsak='Disponible')",
                [mid],
            )
            self.assertEqual(c.fetchone()[0], 0)

    def test_delivered_units_prevent_date_change_and_preserve_program(self):
        p = self.program()
        mid, _ = self.lot(p)
        with connection.cursor() as c:
            c.execute(
                "UPDATE ejemplarbolsa SET estadobolsak='Despachada' WHERE idunidadmadre=%s",
                [mid],
            )
        r = self.call(
            views.RevisarPrograma,
            dict(
                version=p["version"],
                accion="Modificar",
                motivo="Nueva fecha de prueba",
                fechacirugia=(self.surgery + timedelta(days=1)).isoformat(),
                indicacion="Nueva indicación sintética",
                referenciamedica="NEW",
            ),
            ident=p["idprograma"],
            role="MED_SOLICITANTE",
        )
        self.assertEqual(r.status_code, 400, r.data)
        with connection.cursor() as c:
            c.execute(
                "SELECT version,estado FROM programacionautologa WHERE idprograma=%s",
                [p["idprograma"]],
            )
            self.assertEqual(c.fetchone(), (p["version"], "Aprobada"))

    def test_program_expiry_cannot_be_approved_after_surgery_change(self):
        p = self.program()
        self.lot(p)
        p = self.revise(
            p,
            "Modificar",
            role="MED_SOLICITANTE",
            fechacirugia=(self.surgery + timedelta(days=90)).isoformat(),
            indicacion="Nueva fecha fuera de conservación",
            referenciamedica="NEW",
        )
        r = self.call(
            views.RevisarPrograma,
            dict(
                version=p["version"],
                accion="Aprobar",
                confirmada=True,
                motivo="Revisión de conservación",
            ),
            ident=p["idprograma"],
            role="BIOQ_INTEGRAL",
        )
        self.assertEqual(r.status_code, 400, r.data)

    def test_own_program_visibility_and_wrong_patient_collection_rejected(self):
        p = self.program()
        own = self.donor_request(views.Programas, get=True)
        self.assertEqual(
            [v["idprograma"] for v in own.data["programas"]], [p["idprograma"]]
        )
        self.assertEqual(own.data["receptores"], [])
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor,idgrupo) VALUES(%s,'OTHER-REC','O Positivo',%s)",
                [self.person, self.group],
            )
        other = self.call(
            views.CrearPrograma,
            dict(
                idreceptor=self.person,
                fechacirugia=self.surgery.isoformat(),
                indicacion="Otra indicación de prueba",
                referenciamedica="OTHER",
            ),
            role="MED_SOLICITANTE",
        )
        self.assertEqual(other.status_code, 201, other.data)
        other = self.revise(other.data, "Aprobar")
        r = self.call(
            ColectaView,
            dict(
                idtriaje=self.triage(),
                idgrupo=self.group,
                brazoextraccion="Derecho",
                volumenextraidoml=450,
                declaracionjuradaaceptada=True,
                firmadigital="Prueba",
                autologa=True,
                idprograma=other["idprograma"],
                fechacirugia=self.surgery.isoformat(),
            ),
        )
        self.assertEqual(r.status_code, 400, r.data)
        own = self.donor_request(views.Programas, get=True)
        self.assertEqual(
            [v["idprograma"] for v in own.data["programas"]], [p["idprograma"]]
        )

    def test_partial_draft_roundtrip_and_inactive_requirement_invalidates_version(self):
        d = dict(self.payload, respuestas=self.payload["respuestas"][:1])
        self.assertEqual(self.donor_request(views.Borrador, d).status_code, 201)
        draft = self.donor_request(views.Borrador, get=True)
        self.assertEqual(len(draft.data["respuestas"]), 1)
        foreign = APIRequestFactory().get("/", {"idpersona": self.person})
        force_authenticate(
            foreign, user=self.donor, token={"rolActivo": "POSIBLE_DONADOR"}
        )
        self.assertEqual(views.Borrador.as_view()(foreign).status_code, 403)
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM detallecitarequisito")
            self.assertEqual(c.fetchone()[0], 0)
        r = self.call(
            views.Requisitos,
            dict(
                nombrerequisito="Requisito sustituido",
                tiporequisito="General",
                activo=False,
                esexcluyentedefinitivo=False,
            ),
            ident=d["respuestas"][0]["idrequisito"],
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.donor_request(views.Citas, self.payload).status_code, 400)
        self.assertEqual(self.donor_request(views.Borrador, d).status_code, 400)

    def test_close_reopen_cancels_appointments_without_restoring_them(self):
        ident = self.book()
        d = dict(
            fecha=self.day.isoformat(),
            cerrado=True,
            motivo="Cierre excepcional de prueba",
        )
        closed = self.call(views.Cierres, d)
        self.assertEqual(closed.status_code, 201, closed.data)
        self.assertIn(ident, closed.data["citas_canceladas"])
        self.assertEqual(self.call(views.Citas, self.payload).status_code, 400)
        self.assertEqual(
            self.call(views.Turnos, dict(fecha=self.day.isoformat())).status_code, 400
        )
        self.assertEqual(
            self.call(views.Cierres, dict(d, cerrado=False)).status_code, 201
        )
        with connection.cursor() as c:
            c.execute("SELECT estadocita FROM citadonacion WHERE idcita=%s", [ident])
            self.assertEqual(c.fetchone()[0], "Cancelada")
        self.book()

    def test_search_ci_carnet_and_pagination_reach_records_after_first_page(self):
        with connection.cursor() as c:
            for i in range(55):
                c.execute(
                    "INSERT INTO persona(ci,nombres,apellidos,sexo,fechanacimiento) VALUES(%s,'Página','Prueba','M','1990-01-01') RETURNING idpersona",
                    [f"PAGE{i:03}"],
                )
                c.execute(
                    "INSERT INTO posibledonador(idpersona) VALUES(%s)",
                    [c.fetchone()[0]],
                )
        first = self.get(views.Catalogo, dict(q="PAGE"))
        second = self.get(views.Catalogo, dict(q="PAGE", pagina_personas=2))
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(first.data["personas_paginacion"]["total"], 55)
        self.assertEqual(len(first.data["personas"]), 50)
        self.assertEqual(len(second.data["personas"]), 5)
        ci = second.data["personas"][0]["ci"]
        self.assertEqual(len(self.get(views.Catalogo, dict(q=ci)).data["personas"]), 1)
        with connection.cursor() as c:
            c.execute(
                "SELECT carnetprovisionalcodigo FROM posibledonador WHERE idpersona=%s",
                [self.pid],
            )
            code = c.fetchone()[0]
        self.assertEqual(
            self.get(views.Catalogo, dict(q=code)).data["personas"][0]["idpersona"],
            self.pid,
        )
        self.assertEqual(self.get(views.Catalogo, dict(pagina="bad")).status_code, 400)

    def test_presencial_future_day_rejected_without_creating_cita(self):
        r = self.call(
            views.Presencial,
            dict(self.payload, autorizada=True, motivo="Ingreso presencial de prueba"),
        )
        self.assertEqual(r.status_code, 400, r.data)
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM prefiltrocita")
            self.assertEqual(c.fetchone()[0], 0)

    def presencial_with_clock(self, data):
        with connection.cursor() as c:
            c.execute(
                "SELECT inicio FROM agendaturno WHERE idturno=%s", [self.slots[0]]
            )
            clock = c.fetchone()[0] - timedelta(minutes=1)

        # Simula un lunes de atención tanto en Django como en el corte SQL del día.
        # Las escrituras, permisos, cupo y transacciones siguen siendo PostgreSQL reales.
        def local_clock(execute, sql, params, many, context):
            pattern = "CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz'"
            if sql.startswith("SELECT ((") and pattern in sql:
                sql = sql.replace(
                    pattern, "%s::timestamptz AT TIME ZONE 'America/La_Paz'"
                )
                params = [*params, clock]
            return execute(sql, params, many, context)

        with patch(
            "django.utils.timezone.now", return_value=clock
        ), connection.execute_wrapper(local_clock):
            return self.call(views.Presencial, data)

    def test_presencial_positive_persists_assistance_without_prior_triage(self):
        r = self.presencial_with_clock(
            dict(self.payload, autorizada=True, motivo="Ingreso presencial autorizado")
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data["asistenciaconfirmada"])
        with connection.cursor() as c:
            c.execute(
                "SELECT asistenciaconfirmada FROM citadonacion WHERE idcita=%s",
                [r.data["idcita"]],
            )
            self.assertTrue(c.fetchone()[0])
            c.execute("SELECT count(*) FROM triajeclinico")
            self.assertEqual(c.fetchone()[0], 0)

    def test_presencial_failed_donation_prefilter_rolls_back_entire_booking(self):
        r = self.presencial_with_clock(
            dict(
                self.payload,
                tipoatencion="Donacion",
                respuestas=[dict(a, cumple=False) for a in self.payload["respuestas"]],
                autorizada=True,
                motivo="Ingreso presencial autorizado",
            )
        )
        self.assertEqual(r.status_code, 400, r.data)
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM prefiltrocita")
            self.assertEqual(c.fetchone()[0], 0)
            c.execute("SELECT count(*) FROM citadonacion")
            self.assertEqual(c.fetchone()[0], 1)  # solo la cita de la fixture inicial

    def test_static_template_contract_permissions_period_and_audit(self):
        clinical = self.get(CatalogoEstatico, role="DOC_TRIAJE")
        self.assertNotIn("ingresos_diarios", clinical.data)
        self.assertEqual(
            self.get(
                InformeEstatico, dict(plantilla="ingresos_diarios"), role="DOC_TRIAJE"
            ).status_code,
            403,
        )
        self.assertEqual(
            self.get(
                InformeEstatico, dict(plantilla="donaciones_diarias", dimension="brazo")
            ).status_code,
            400,
        )
        self.assertEqual(
            self.get(
                InformeEstatico, dict(plantilla="inventario_actual", desde="2026-01-01")
            ).status_code,
            400,
        )
        report = self.get(InformeEstatico, dict(plantilla="donaciones_diarias"))
        self.assertEqual(report.status_code, 200, report.data)
        self.assertEqual(report.data["columnas"], ["dimension", "cantidad", "volumen"])
        self.assertEqual(report.data["caso"], "CU23")
        self.assertEqual(report.data["totales"]["cantidad"], 1)
        with connection.cursor() as c:
            c.execute(
                "SELECT count(*) FROM bitacoraauditoria WHERE accionrealizada LIKE 'CU23 consulta%%'"
            )
            self.assertEqual(c.fetchone()[0], 1)
        self.assertEqual(
            self.get(
                InformeEstatico,
                dict(plantilla="inventario_actual"),
                role="TEC_LOGISTICA",
            ).status_code,
            200,
        )

    def test_surgery_day_release_and_episode_close_preserve_delivered_history(self):
        p = self.program()
        mid, _ = self.lot(p)
        with patch("apps.agenda.autologous.today", return_value=self.surgery):
            self.assertEqual(self.call(LiberarView, madre=mid, role="BIOQ_INTEGRAL").status_code, 200)
        with connection.cursor() as c:
            c.execute(
                "UPDATE ejemplarbolsa SET estadobolsak='Despachada' WHERE idunidadmadre=%s",
                [mid],
            )
        with patch(
            "apps.agenda.autologous.today",
            return_value=self.surgery + timedelta(days=1),
        ):
            closed = self.revise(p, "Cerrar")
        self.assertEqual(closed["estado"], "Cerrada")
        with connection.cursor() as c:
            c.execute(
                "SELECT estadobolsak,esexclusivoautologo FROM ejemplarbolsa WHERE idunidadmadre=%s",
                [mid],
            )
            self.assertEqual(c.fetchone(), ("Despachada", True))

    def test_missing_migration09_returns_503_without_writing(self):
        with connection.cursor() as c:
            c.execute(
                "ALTER TABLE programacionautologahistorial RENAME TO programacionautologahistorial_hidden"
            )
        try:
            self.assertEqual(self.get(views.Catalogo).status_code, 503)
            self.assertEqual(
                self.call(
                    views.Borrador, dict(self.payload, respuestas=[])
                ).status_code,
                503,
            )
        finally:
            with connection.cursor() as c:
                c.execute(
                    "ALTER TABLE programacionautologahistorial_hidden RENAME TO programacionautologahistorial"
                )

    def test_static_exports_are_real_pdf_and_csv_and_empty_report(self):
        for fmt in ["pdf", "csv"]:
            r = self.get(
                InformeEstatico, dict(plantilla="donaciones_diarias", formato=fmt)
            )
            self.assertEqual(r.status_code, 200)
            self.assertTrue(
                r.content.startswith(b"%PDF")
                if fmt == "pdf"
                else "HemoVida CU23" in r.content.decode("utf-8-sig")
            )
        empty = self.get(
            InformeEstatico,
            dict(
                plantilla="donaciones_diarias", desde="2000-01-01", hasta="2000-01-02"
            ),
        )
        self.assertEqual(empty.data["filas"], [])
        self.assertEqual(empty.data["totales"]["cantidad"], 0)

    def test_registration_postgresql_hash_login_and_rollback_on_hash_failure(self):
        d = dict(
            ci="REG-LOCAL",
            nombres="Registro",
            apellidos="Prueba",
            sexo="M",
            fechaNacimiento="1990-01-01",
            username="reg.local",
            email="reg@example.test",
            password="SyntheticStrong#2026",
        )
        request = APIRequestFactory().post("/", d, format="json")
        r = AutoRegistroPosibleDonadorView.as_view()(request)
        self.assertEqual(r.status_code, 201, r.data)
        user = Usuario.objects.get(username=d["username"])
        self.assertNotEqual(user.passwordHash, d["password"])
        self.assertTrue(user.check_password(d["password"]))
        self.assertTrue(user.roles.filter(codigoRol="POSIBLE_DONADOR").exists())
        prefixed = dict(
            d,
            ci="REG-PREFIX",
            username="reg.prefix",
            email="prefix@example.test",
            password="pbkdf2_ExampleStrong#2026",
        )
        r = AutoRegistroPosibleDonadorView.as_view()(
            APIRequestFactory().post("/", prefixed, format="json")
        )
        self.assertEqual(r.status_code, 201, r.data)
        prefixed_user = Usuario.objects.get(username=prefixed["username"])
        self.assertNotEqual(prefixed_user.passwordHash, prefixed["password"])
        self.assertTrue(prefixed_user.check_password(prefixed["password"]))
        with patch.object(
            Usuario, "set_password", side_effect=RuntimeError("synthetic failure")
        ):
            request = APIRequestFactory().post(
                "/",
                dict(d, ci="REG-FAIL", username="reg.fail", email="fail@example.test"),
                format="json",
            )
            failed = AutoRegistroPosibleDonadorView.as_view()(request)
        self.assertEqual(failed.status_code, 400)
        self.assertNotIn("synthetic failure", str(failed.data))
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM persona WHERE ci='REG-FAIL'")
            self.assertEqual(c.fetchone()[0], 0)
