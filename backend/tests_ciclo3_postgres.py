"""Integración en la BD desechable hemo_liberacion_test; jamás Supabase."""

import unittest, json, time, hmac, hashlib
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch
from django.test import override_settings
from tests_clinica_postgres import ClinicalTests
from django.db import connection
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.clinica.views import (
    IncidenciaView,
    BajaMadreView,
    ProtocoloView,
    ComunicacionView,
    DiferimientoView,
    FraccionamientoView,
)
from apps.laboratorio.views import AnalisisView, LiberarView
from apps.finanzas.views import (
    DeudaView,
    PagoView,
    CheckoutView,
    StripeWebhook,
    Catalogo,
)
from apps.reportes.views import Consulta


class Cycle3Tests(ClinicalTests):
    def setUp(self):
        override = override_settings(
            STRIPE_SECRET_KEY="sk_test_synthetic",
            STRIPE_WEBHOOK_SECRET="whsec_synthetic",
            STRIPE_MODE="test",
        )
        override.enable()
        self.addCleanup(override.disable)
        super().setUp()
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor,idgrupo) VALUES(%s,'REC-LOCAL','O Positivo',%s)",
                [self.pid, self.group],
            )
            c.execute(
                "INSERT INTO institucionsalud(nombreinstitucion,tipoinstitucion,direccion,telefonocontacto) VALUES('Local','Clinica','Local','0') RETURNING idinstitucion"
            )
            self.institution = c.fetchone()[0]
            c.execute(
                "INSERT INTO solicitudhospitalaria(idinstitucion,idreceptor,numerosolicitud,prioridadsolicitud,cantidadbolsassolicitadas) VALUES(%s,%s,'SOL-CYCLE3','Programada',1) RETURNING idsolicitud",
                [self.institution, self.pid],
            )
            self.order = c.fetchone()[0]

    def debt(self):
        r = self.call(
            DeudaView,
            dict(
                idsolicitud=self.order,
                montooriginal="100.00",
                motivodeuda="Prueba local",
            ),
        )
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["iddeuda"]

    def get(self, view, params):
        req = APIRequestFactory().get("/", params)
        force_authenticate(req, user=self.user, token={"rolActivo": "ADMIN"})
        return view.as_view()(req)

    def test_observations_incident_prevents_successful_collection(self):
        self.vitals["observaciones"] = "Observación de prueba"
        t = self.triage()
        with connection.cursor() as c:
            c.execute("SELECT observaciones FROM triajeclinico WHERE idtriaje=%s", [t])
            self.assertEqual(c.fetchone()[0], "Observación de prueba")
        self.assertEqual(
            self.call(
                IncidenciaView,
                dict(
                    idtriaje=t,
                    motivo="Colecta interrumpida de prueba",
                    volumenobtenidoml=30,
                ),
            ).status_code,
            201,
        )
        d = dict(
            idtriaje=t,
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=True,
            firmadigital="test",
        )
        self.assertEqual(
            self.call(
                __import__("apps.clinica.views", fromlist=["ColectaView"]).ColectaView,
                d,
            ).status_code,
            400,
        )

    def test_temperature_protocol_and_mother_discard(self):
        m = self.collect()["idunidadmadre"]
        with connection.cursor() as c:
            c.execute(
                "UPDATE ubicacionalmacen SET temperaturaregistro=20 WHERE idubicacion=%s",
                [self.loc],
            )
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
        self.assertEqual(self.call(FraccionamientoView, d, madre=m).status_code, 400)
        with connection.cursor() as c:
            c.execute(
                "UPDATE ubicacionalmacen SET temperaturaregistro=4 WHERE idubicacion=%s",
                [self.loc],
            )
        self.fraction(m)
        r = self.call(BajaMadreView, {"motivobaja": "Daño del lote de prueba"}, madre=m)
        self.assertEqual(r.status_code, 201, r.data)
        with connection.cursor() as c:
            c.execute(
                "SELECT DISTINCT estadobolsak FROM ejemplarbolsa WHERE idunidadmadre=%s",
                [m],
            )
            self.assertEqual(c.fetchone()[0], "Baja")
            c.execute("SELECT count(*) FROM bajainventario WHERE idunidadmadre=%s", [m])
            self.assertEqual(c.fetchone()[0], 1)

    def test_lab_deferral_and_communication(self):
        m = self.collect()["idunidadmadre"]
        r = self.call(AnalisisView, self.sero, madre=m, tipo="serologia")
        self.assertEqual(r.status_code, 201, r.data)
        d = dict(
            idpersona=self.pid,
            idserologia=r.data["id"],
            tipo="Temporal",
            diasinhabilitacion=30,
            motivodetallado="Revisión profesional",
        )
        r = self.call(DiferimientoView, d)
        self.assertEqual(r.status_code, 201, r.data)
        r = self.call(
            ComunicacionView,
            {"canal": "Presencial", "confirmada": True},
            diferimiento=r.data["iddiferimiento"],
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIsNotNone(r.data["comunicacionfecha"])

    def test_autologous_fraction_release_remains_exclusive(self):
        t = self.triage()
        d = dict(
            idtriaje=t,
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=True,
            firmadigital="test",
            autologa=True,
            fechacirugia="2030-01-01",
        )
        from datetime import date, timedelta

        d["fechacirugia"] = (date.today() + timedelta(days=10)).isoformat()
        from apps.clinica.views import ColectaView

        r = self.call(ColectaView, d)
        self.assertEqual(r.status_code, 201, r.data)
        m = r.data["idunidadmadre"]
        self.fraction(m)
        for kind, payload in [("serologia", self.sero), ("hematologia", self.hema)]:
            self.assertEqual(
                self.call(AnalisisView, payload, madre=m, tipo=kind).status_code, 201
            )
        r = self.call(LiberarView, madre=m)
        self.assertEqual(r.status_code, 200, r.data)
        with connection.cursor() as c:
            c.execute(
                "SELECT estadobolsak,esexclusivoautologo FROM ejemplarbolsa WHERE idunidadmadre=%s",
                [m],
            )
            self.assertEqual(c.fetchone(), ("Reservada", True))

    def test_manual_partial_idempotency_full_receipt(self):
        debt = self.debt()
        d = dict(
            montopagado="40.00", metodopago="Efectivo", referenciaexterna="MANUAL-TEST"
        )
        r = self.call(PagoView, d, deuda=debt)
        self.assertEqual(r.status_code, 201, r.data)
        first = r.data["idpago"]
        self.assertEqual(self.call(PagoView, d, deuda=debt).data["idpago"], first)
        self.assertEqual(
            self.call(
                PagoView,
                dict(d, montopagado="70.00", referenciaexterna="TOO-MUCH"),
                deuda=debt,
            ).status_code,
            400,
        )
        self.assertEqual(
            self.call(
                PagoView,
                dict(d, montopagado="60.00", referenciaexterna="BALANCE"),
                deuda=debt,
            ).status_code,
            201,
        )
        with connection.cursor() as c:
            c.execute(
                "SELECT saldopendiente FROM deudafinanciera WHERE iddeuda=%s", [debt]
            )
            self.assertEqual(c.fetchone()[0], 0)
            c.execute("SELECT count(*) FROM comprobantepago WHERE iddeuda=%s", [debt])
            self.assertEqual(c.fetchone()[0], 1)

    @patch("apps.finanzas.services.stripe.checkout.Session.create")
    @patch("apps.finanzas.views.stripe.checkout.Session.retrieve")
    def test_stripe_signed_webhook_idempotency_and_currency(self, retrieve, create):
        create.return_value = SimpleNamespace(
            id="cs_test_synthetic", url="https://checkout.stripe.com/test"
        )
        debt = self.debt()
        d = dict(
            montopagado="100.00", idempotencia="00000000-0000-4000-8000-000000000001"
        )
        r = self.call(CheckoutView, d, deuda=debt)
        self.assertEqual(r.status_code, 201, r.data)
        pid = r.data["idpago"]
        self.assertEqual(self.call(CheckoutView, d, deuda=debt).status_code, 201)
        self.assertEqual(create.call_count, 1)
        # Contrato vigente de Stripe, verificado también contra su API test.
        self.assertEqual(
            create.call_args.kwargs["allowed_payment_method_types"], ["card"]
        )
        self.assertNotIn("payment_method_types", create.call_args.kwargs)
        event = {
            "id": "evt_test_synthetic",
            "type": "checkout.session.completed",
            "livemode": False,
            "data": {"object": {"id": "cs_test_synthetic"}},
        }
        retrieve.return_value = {
            "id": "cs_test_synthetic",
            "currency": "bob",
            "amount_total": 10000,
            "client_reference_id": str(pid),
            "payment_status": "paid",
        }
        raw = json.dumps(event).encode()
        stamp = str(int(time.time()))
        signature = hmac.new(
            b"whsec_synthetic", stamp.encode() + b"." + raw, hashlib.sha256
        ).hexdigest()

        def send(sig):
            return StripeWebhook.as_view()(
                APIRequestFactory().post(
                    "/", raw, content_type="application/json", HTTP_STRIPE_SIGNATURE=sig
                )
            )

        self.assertEqual(send("invalid").status_code, 400)
        retrieve.return_value["currency"] = "usd"
        self.assertEqual(send(f"t={stamp},v1={signature}").status_code, 400)
        retrieve.return_value["currency"] = "bob"
        self.assertEqual(send(f"t={stamp},v1={signature}").status_code, 200)
        self.assertEqual(send(f"t={stamp},v1={signature}").status_code, 200)
        with connection.cursor() as c:
            c.execute(
                "SELECT montoabonado FROM deudafinanciera WHERE iddeuda=%s", [debt]
            )
            self.assertEqual(c.fetchone()[0], 100)
            c.execute("SELECT count(*) FROM eventostripe")
            self.assertEqual(c.fetchone()[0], 1)

    def test_reports_whitelist_finance_no_double_count_and_exports(self):
        debt = self.debt()
        self.call(
            PagoView,
            dict(
                montopagado="100", metodopago="Efectivo", referenciaexterna="REPORT-PAY"
            ),
            deuda=debt,
        )
        r = self.get(Consulta, {"fuente": "recaudacion", "dimension": "metodo"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["totales"]["importe"], 100)
        r = self.get(Consulta, {"fuente": "triajes"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIsNone(r.data["totales"]["porcentaje_aptitud"])
        self.assertEqual(
            self.get(Consulta, {"fuente": "stock", "desde": "2026-01-01"}).status_code,
            400,
        )
        self.assertEqual(
            self.get(
                Consulta, {"fuente": "recaudacion", "dimension": "drop table usuario"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.get(Consulta, {"fuente": "recaudacion", "formato": "csv"}).status_code,
            200,
        )
        pdf = self.get(Consulta, {"fuente": "recaudacion", "formato": "pdf"})
        self.assertEqual(pdf.status_code, 200)
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        r = self.get(Catalogo, {})
        self.assertEqual(r.status_code, 200, r.data)

    def test_autologous_correction_reactivation_and_exclusive_custody(self):
        from datetime import date, timedelta
        from apps.clinica.views import (
            ColectaView,
            CustodiaView,
            CustodiaAutologaView,
            ReactivarAutologaView,
        )

        d = dict(
            idtriaje=self.triage(),
            idgrupo=self.group,
            brazoextraccion="Derecho",
            volumenextraidoml=450,
            declaracionjuradaaceptada=True,
            firmadigital="test",
            autologa=True,
            fechacirugia=(date.today() + timedelta(days=10)).isoformat(),
        )
        r = self.call(ColectaView, d)
        self.assertEqual(r.status_code, 201, r.data)
        m = r.data["idunidadmadre"]
        parts, _ = self.fraction(m)
        bolsa = parts["componentes"][0]
        for kind, payload in [("serologia", self.sero), ("hematologia", self.hema)]:
            self.assertEqual(
                self.call(AnalisisView, payload, madre=m, tipo=kind).status_code, 201
            )
        self.assertEqual(self.call(LiberarView, madre=m).status_code, 200)
        self.assertEqual(
            self.call(CustodiaView, {"idubicacion": self.loc}, bolsa=bolsa).status_code,
            400,
        )
        self.assertEqual(
            self.call(
                CustodiaAutologaView, {"idubicacion": self.loc}, bolsa=bolsa
            ).status_code,
            201,
        )
        bad = dict(
            self.sero,
            codigoanalisis="SER-CORRECT",
            dictamenfinal="No Apto",
            resultadovih="Reactivo",
        )
        with connection.cursor() as c:
            c.execute(
                "SELECT idanalisis FROM analisisinmunoserologico WHERE idunidadmadre=%s",
                [m],
            )
            analysis = c.fetchone()[0]

        def correct(payload):
            req = APIRequestFactory().put("/", payload, format="json")
            force_authenticate(req, user=self.user, token={"rolActivo": "ADMIN"})
            return AnalisisView.as_view()(
                req, madre=m, tipo="serologia", analisis_id=analysis
            )

        r = correct(bad)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(
            self.call(ReactivarAutologaView, {"confirmada": True}, madre=m).status_code,
            400,
        )
        self.assertEqual(
            correct(dict(self.sero, codigoanalisis="SER-REVIEW")).status_code, 200
        )
        self.assertEqual(self.call(LiberarView, madre=m).status_code, 400)
        r = self.call(ReactivarAutologaView, {"confirmada": True}, madre=m)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.call(LiberarView, madre=m).status_code, 200)
        with connection.cursor() as c:
            c.execute(
                "SELECT estadobolsak,esexclusivoautologo FROM ejemplarbolsa WHERE idejemplarbolsa=%s",
                [bolsa],
            )
            self.assertEqual(c.fetchone(), ("Reservada", True))

    @patch("apps.finanzas.services.stripe.checkout.Session.create")
    def test_checkout_timeout_retry_and_manual_block(self, create):
        import stripe

        debt = self.debt()
        payload = dict(
            montopagado="100", idempotencia="00000000-0000-4000-8000-000000000002"
        )
        create.side_effect = stripe.APIConnectionError("synthetic")
        self.assertEqual(self.call(CheckoutView, payload, deuda=debt).status_code, 502)
        self.assertEqual(
            self.call(
                PagoView,
                dict(
                    montopagado="1", metodopago="Efectivo", referenciaexterna="BLOCKED"
                ),
                deuda=debt,
            ).status_code,
            400,
        )
        create.side_effect = None
        create.return_value = SimpleNamespace(
            id="cs_test_retry", url="https://checkout.stripe.com/test"
        )
        r = self.call(CheckoutView, payload, deuda=debt)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(
            create.call_args.kwargs["idempotency_key"], payload["idempotencia"]
        )
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM pagofinanciero")
            self.assertEqual(c.fetchone()[0], 1)
            c.execute(
                "SELECT montoabonado FROM deudafinanciera WHERE iddeuda=%s", [debt]
            )
            self.assertEqual(c.fetchone()[0], 0)

    @patch("apps.finanzas.services.stripe.checkout.Session.create")
    def test_checkout_definitive_rejection_allows_corrected_payment(self, create):
        import stripe

        create.side_effect = stripe.InvalidRequestError("synthetic", "amount")
        debt = self.debt()
        self.assertEqual(
            self.call(
                CheckoutView,
                dict(
                    montopagado="0.01",
                    idempotencia="00000000-0000-4000-8000-000000000003",
                ),
                deuda=debt,
            ).status_code,
            400,
        )
        r = self.call(
            PagoView,
            dict(
                montopagado="100", metodopago="Efectivo", referenciaexterna="CORRECTED"
            ),
            deuda=debt,
        )
        self.assertEqual(r.status_code, 201, r.data)

    @patch("apps.finanzas.services.stripe.checkout.Session.create")
    @patch("apps.finanzas.services.stripe.checkout.Session.expire")
    @patch("apps.finanzas.services.stripe.checkout.Session.retrieve")
    def test_reconcile_expiry_paid_precedence_and_terminal_retry(
        self, retrieve, expire, create
    ):
        from apps.finanzas.views import AnularCheckoutView, ConciliarView
        from apps.finanzas.services import process_event

        create.return_value = SimpleNamespace(
            id="cs_test_reconcile", url="https://checkout.stripe.com/test"
        )
        debt = self.debt()
        payload = dict(
            montopagado="100", idempotencia="00000000-0000-4000-8000-000000000004"
        )
        r = self.call(CheckoutView, payload, deuda=debt)
        self.assertEqual(r.status_code, 201, r.data)
        pid = r.data["idpago"]
        session = dict(
            id="cs_test_reconcile",
            currency="bob",
            amount_total=10000,
            client_reference_id=str(pid),
            payment_status="unpaid",
            status="open",
        )
        retrieve.return_value = session
        expire.return_value = dict(session, status="expired")
        r = self.call(AnularCheckoutView, pago=pid)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(expire.call_count, 1)
        with connection.cursor() as c:
            c.execute(
                "SELECT estadotransaccion FROM pagofinanciero WHERE idpago=%s", [pid]
            )
            self.assertEqual(c.fetchone()[0], "Anulada")
        retrieve.return_value = dict(session, status="complete", payment_status="paid")
        self.assertEqual(self.call(ConciliarView, pago=pid).status_code, 200)
        process_event(
            {"id": "evt_old_expiry", "type": "checkout.session.expired"},
            retrieve.return_value,
        )
        self.assertEqual(self.call(CheckoutView, payload, deuda=debt).status_code, 400)
        with connection.cursor() as c:
            c.execute(
                "SELECT montoabonado FROM deudafinanciera WHERE iddeuda=%s", [debt]
            )
            self.assertEqual(c.fetchone()[0], 100)
            c.execute("SELECT count(*) FROM comprobantepago WHERE iddeuda=%s", [debt])
            self.assertEqual(c.fetchone()[0], 1)

    def test_financial_permissions_unknown_currency_and_administrative_treatment(self):
        from apps.finanzas.views import MonedaView, TratamientoView

        debt = self.debt()
        with connection.cursor() as c:
            c.execute("UPDATE deudafinanciera SET moneda=NULL WHERE iddeuda=%s", [debt])
        payload = dict(
            montopagado="100", metodopago="Efectivo", referenciaexterna="CURRENCY"
        )
        self.assertEqual(self.call(PagoView, payload, deuda=debt).status_code, 400)
        self.assertEqual(
            self.call(MonedaView, {"confirmada": False}, deuda=debt).status_code, 400
        )
        self.assertEqual(
            self.call(
                MonedaView, {"confirmada": True}, deuda=debt, role="DOC_TRIAJE"
            ).status_code,
            403,
        )
        self.assertEqual(
            self.call(MonedaView, {"confirmada": True}, deuda=debt).status_code, 201
        )
        self.assertEqual(self.call(PagoView, payload, deuda=debt).status_code, 201)
        self.assertEqual(
            self.call(
                TratamientoView,
                dict(
                    estadopago="Exonerado SUS",
                    conceptoservicio="Prueba",
                    numerorecibofactura="DOC-TEST",
                ),
                solicitud=self.order,
            ).status_code,
            400,
        )
        with override_settings(STRIPE_SECRET_KEY="", STRIPE_WEBHOOK_SECRET=""):
            self.assertEqual(
                self.call(
                    CheckoutView,
                    dict(
                        montopagado="1",
                        idempotencia="00000000-0000-4000-8000-000000000005",
                    ),
                    deuda=debt,
                ).status_code,
                503,
            )
        req = APIRequestFactory().get("/", {"fuente": "recaudacion"})
        force_authenticate(req, user=self.user, token={"rolActivo": "DOC_TRIAJE"})
        self.assertEqual(Consulta.as_view()(req).status_code, 403)

    def test_concurrent_manual_payments_do_not_overpay(self):
        from concurrent.futures import ThreadPoolExecutor
        from django.db import connections

        debt = self.debt()

        def pay(n):
            try:
                return self.call(
                    PagoView,
                    dict(
                        montopagado="60",
                        metodopago="Efectivo",
                        referenciaexterna=f"CONCURRENT-{n}",
                    ),
                    deuda=debt,
                ).status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(pay, [1, 2]))
        self.assertEqual(sorted(results), [201, 400])
        with connection.cursor() as c:
            c.execute(
                "SELECT montoabonado,saldopendiente FROM deudafinanciera WHERE iddeuda=%s",
                [debt],
            )
            self.assertEqual(c.fetchone(), (60, 40))

    def test_reports_all_sources_filters_and_pending_denominator(self):
        from apps.reportes.services import CATALOG, query

        debt = self.debt()
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO pagofinanciero(iddeuda,montopagado,metodopago,proveedorpasarela) VALUES(%s,10,'Tarjeta','Stripe')",
                [debt],
            )
        result = query({"fuente": "intentos"})
        self.assertEqual(result["totales"]["cantidad"], 1)
        self.assertIsNone(result["totales"]["porcentaje_confirmacion"])
        result = query({"fuente": "recaudacion"})
        self.assertEqual(result["totales"]["importe"], 0)
        for kind in CATALOG:
            r = self.get(Consulta, {"fuente": kind})
            self.assertEqual(r.status_code, 200, (kind, r.data))
        self.assertEqual(
            self.get(Consulta, {"fuente": "stock", "grupo": "1 OR 1=1"}).status_code,
            400,
        )
        self.assertEqual(
            self.get(
                Consulta, {"fuente": "extracciones", "metodo": "Efectivo"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.get(
                Consulta,
                {"fuente": "intentos", "desde": "2030-12-31", "hasta": "2020-01-01"},
            ).status_code,
            400,
        )

    @patch("apps.finanzas.services.stripe.checkout.Session.create")
    def test_old_uncertain_checkout_never_creates_second_session(self, create):
        import stripe

        debt = self.debt()
        payload = dict(
            montopagado="100", idempotencia="00000000-0000-4000-8000-000000000006"
        )
        create.side_effect = stripe.APIConnectionError("synthetic")
        self.assertEqual(self.call(CheckoutView, payload, deuda=debt).status_code, 502)
        with connection.cursor() as c:
            c.execute(
                "UPDATE checkoutstripe SET fechacreacion=now()-interval '25 hours'"
            )
        create.reset_mock()
        self.assertEqual(self.call(CheckoutView, payload, deuda=debt).status_code, 400)
        create.assert_not_called()

    def test_approved_conservation_requires_agitation_and_verified_equipment(self):
        from apps.clinica.views import CondicionesView

        m = self.collect()["idunidadmadre"]
        protocol = dict(
            tipocomponente="Concentrado de Globulos Rojos",
            temperaturamin="2",
            temperaturamax="6",
            diasconservacion=35,
            requiereagitacion=True,
        )
        self.assertEqual(
            self.call(ProtocoloView, protocol, role="TEC_LOGISTICA").status_code, 403
        )
        self.assertEqual(self.call(ProtocoloView, protocol).status_code, 201)
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
        conditions = dict(
            temperaturaregistro="4", tieneagitacion=True, verificadas=False
        )
        self.assertEqual(
            self.call(CondicionesView, conditions, ubicacion=self.loc).status_code, 400
        )
        self.assertEqual(
            self.call(
                CondicionesView, dict(conditions, verificadas=True), ubicacion=self.loc
            ).status_code,
            201,
        )
        self.assertEqual(
            self.call(FraccionamientoView, parts, madre=m).status_code, 201
        )

    def test_serology_indeterminate_excluded_from_reactivity_denominator(self):
        from apps.reportes.services import query

        m = self.collect()["idunidadmadre"]
        payload = dict(
            self.sero,
            dictamenfinal="No Apto",
            resultadovih="Reactivo",
            resultadochagas="Indeterminado",
        )
        r = self.call(AnalisisView, payload, madre=m, tipo="serologia")
        self.assertEqual(r.status_code, 201, r.data)
        result = query({"fuente": "serologia"})["totales"]
        self.assertEqual(
            (
                result["cantidad"],
                result["reactivas"],
                result["indeterminadas"],
                result["concluidas"],
            ),
            (1, 0, 1, 0),
        )
        self.assertIsNone(result["porcentaje_reactividad"])
        with connection.cursor() as c:
            c.execute(
                "UPDATE analisisinmunoserologico SET resultadochagas='No Reactivo' WHERE idanalisis=%s",
                [r.data["id"]],
            )
        self.assertEqual(
            query({"fuente": "serologia"})["totales"]["porcentaje_reactividad"], 100
        )

    def test_triage_deferral_rate_weighted_filters_empty_and_export(self):
        from apps.reportes.services import query

        self.assertIsNone(
            query({"fuente": "triajes"})["totales"]["porcentaje_diferimiento"]
        )
        with connection.cursor() as c:
            for days, status in [
                (2, "Rechazado"),
                (1, "Apto"),
                (1, "Apto"),
                (1, "Apto"),
            ]:
                c.execute(
                    "INSERT INTO triajeclinico(idposibledonador,idpersonalsalud,fechahora,pesokg,presionsistolicammhg,presiondiastolicammhg,nivelhemoglobina,temperatura,resultadoaptitud) VALUES(%s,%s,CURRENT_TIMESTAMP-%s*interval '1 day',70,120,80,14,36.5,%s)",
                    [self.pid, self.person, days, status],
                )
        result = query({"fuente": "triajes", "dimension": "dia"})
        self.assertEqual(result["totales"]["rechazados"], 1)
        self.assertEqual(result["totales"]["cantidad"], 4)
        self.assertEqual(result["totales"]["porcentaje_diferimiento"], 25)
        self.assertEqual(
            sorted(r["porcentaje_diferimiento"] for r in result["filas"]), [0, 100]
        )
        filtered = query({"fuente": "triajes", "estado": "Rechazado"})
        self.assertEqual(filtered["totales"]["porcentaje_diferimiento"], 100)
        csv = self.get(Consulta, {"fuente": "triajes", "formato": "csv"})
        self.assertEqual(csv.status_code, 200)
        self.assertIn(b"porcentaje_diferimiento", csv.content)

    def test_report_area_permissions_cover_catalog_query_and_exports(self):
        from apps.reportes.access import SOURCES_BY_ROLE
        from apps.reportes.views import Catalogo as ReportCatalog
        from apps.reportes.services import CATALOG

        def get_as(view, params, role):
            req = APIRequestFactory().get("/", params)
            force_authenticate(req, user=self.user, token={"rolActivo": role})
            return view.as_view()(req)

        for role, allowed in SOURCES_BY_ROLE.items():
            catalog = get_as(ReportCatalog, {}, role)
            self.assertEqual(catalog.status_code, 200, catalog.data)
            self.assertEqual(set(catalog.data), set(allowed))
            for source in CATALOG:
                r = get_as(Consulta, {"fuente": source}, role)
                self.assertEqual(
                    r.status_code,
                    200 if source in allowed else 403,
                    (role, source, r.data),
                )
            for fmt in ["csv", "pdf"]:
                r = get_as(Consulta, {"fuente": allowed[0], "formato": fmt}, role)
                self.assertEqual(r.status_code, 200, (role, fmt))
                if role != "ADMIN":
                    r = get_as(
                        Consulta, {"fuente": "recaudacion", "formato": fmt}, role
                    )
                    self.assertEqual(r.status_code, 403)
        self.assertEqual(get_as(ReportCatalog, {}, "PERS_COLECTA").status_code, 403)
        with connection.cursor() as c:
            c.execute(
                "DELETE FROM usuariorol WHERE idusuario=%s AND idrol=(SELECT idrol FROM rol WHERE codigorol='DOC_TRIAJE')",
                [self.uid],
            )
        self.assertEqual(
            get_as(Consulta, {"fuente": "triajes"}, "DOC_TRIAJE").status_code, 403
        )

    def test_report_dates_use_bolivian_day_for_legacy_and_financial_timestamps(self):
        from apps.reportes.services import query

        debt = self.debt()
        with connection.cursor() as c:
            for stamp, status in [
                ("2026-11-01 02:00:00", "Rechazado"),
                ("2026-11-01 05:00:00", "Apto"),
            ]:
                c.execute(
                    "INSERT INTO triajeclinico(idposibledonador,idpersonalsalud,fechahora,pesokg,presionsistolicammhg,presiondiastolicammhg,nivelhemoglobina,temperatura,resultadoaptitud) VALUES(%s,%s,%s,70,120,80,14,36.5,%s)",
                    [self.pid, self.person, stamp, status],
                )
                c.execute(
                    "INSERT INTO pagofinanciero(iddeuda,montopagado,metodopago,estadotransaccion,fechahorapago,proveedorpasarela) VALUES(%s,50,'Efectivo','Confirmada',%s::timestamp AT TIME ZONE 'UTC','Manual')",
                    [debt, stamp],
                )
        params = {"desde": "2026-10-31", "hasta": "2026-10-31"}
        triage = query(dict(params, fuente="triajes"))
        self.assertEqual(triage["totales"]["cantidad"], 1)
        self.assertEqual(triage["totales"]["porcentaje_diferimiento"], 100)
        self.assertEqual(triage["filas"][0]["dimension"], "2026-10-31")
        revenue = query(dict(params, fuente="recaudacion", dimension="mes"))
        self.assertEqual(revenue["totales"]["importe"], 50)
        self.assertEqual(revenue["filas"][0]["dimension"], "2026-10")
        next_day = query(
            {"fuente": "triajes", "desde": "2026-11-01", "hasta": "2026-11-01"}
        )
        self.assertEqual(next_day["totales"]["cantidad"], 1)
        self.assertEqual(next_day["totales"]["porcentaje_diferimiento"], 0)

    def test_partial_migration07_prevents_financial_write(self):
        with connection.cursor() as c:
            c.execute(
                "ALTER TABLE checkoutstripe RENAME COLUMN monto TO monto_hidden_test"
            )
        try:
            r = self.call(
                DeudaView,
                dict(idsolicitud=self.order, montooriginal="100", motivodeuda="Prueba"),
            )
            self.assertEqual(r.status_code, 503, r.data)
        finally:
            with connection.cursor() as c:
                c.execute(
                    "ALTER TABLE checkoutstripe RENAME COLUMN monto_hidden_test TO monto"
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
