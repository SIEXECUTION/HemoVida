from django.db import connection, DatabaseError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from django.conf import settings
import stripe
from apps.clinica.views import ClinicalRole, Mutation
from apps.clinica.services import rows, revision07
from apps.laboratorio.views import ConflictoLaboratorio
from . import serializers as forms, services as ops


class Catalogo(APIView):
    permission_classes = [ClinicalRole]
    roles = ["ADMIN"]

    def get(self, request):
        with connection.cursor() as c:
            revision07(c)
            return Response(
                {
                    "moneda": "BOB",
                    "pais_cuenta": "US",
                    "stripe_configurado": bool(
                        settings.STRIPE_SECRET_KEY and settings.STRIPE_WEBHOOK_SECRET
                    ),
                    "solicitudes": rows(
                        c,
                        "SELECT idsolicitud,numerosolicitud,prioridadsolicitud FROM solicitudhospitalaria ORDER BY idsolicitud DESC LIMIT 200",
                    ),
                    "deudas": rows(
                        c,
                        "SELECT v.*,d.moneda FROM vw_cu22_cuentas_por_cobrar v JOIN deudafinanciera d USING(iddeuda) ORDER BY iddeuda DESC LIMIT 200",
                    ),
                    "pagos": rows(
                        c,
                        "SELECT p.*,s.idempotencia,s.urlcheckout FROM pagofinanciero p LEFT JOIN checkoutstripe s USING(idpago) ORDER BY idpago DESC LIMIT 300",
                    ),
                    "eventos": rows(
                        c,
                        "SELECT * FROM eventostripe ORDER BY fecharecepcion DESC LIMIT 100",
                    ),
                    "comprobantes": rows(
                        c,
                        "SELECT * FROM comprobantepago ORDER BY idcomprobante DESC LIMIT 100",
                    ),
                }
            )


class DeudaView(Mutation):
    roles = ["ADMIN"]
    form = forms.Deuda
    operation = staticmethod(ops.create_debt)


class PagoView(Mutation):
    roles = ["ADMIN"]
    form = forms.Pago
    operation = staticmethod(ops.manual_payment)


class CheckoutView(Mutation):
    roles = ["ADMIN"]
    form = forms.Intento
    operation = staticmethod(ops.checkout)


class TratamientoView(Mutation):
    roles = ["ADMIN"]
    form = forms.Tratamiento
    operation = staticmethod(ops.treatment)


class StripeWebhook(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ops.available()
        try:
            event = stripe.Webhook.construct_event(
                request.body,
                request.headers.get("Stripe-Signature", ""),
                settings.STRIPE_WEBHOOK_SECRET,
                tolerance=300,
            )
        except (ValueError, stripe.SignatureVerificationError):
            raise ValidationError("Firma Stripe inválida.")
        event = event.to_dict()
        if bool(event.get("livemode")) != (settings.STRIPE_MODE == "live"):
            raise ValidationError("Modo Stripe incompatible.")
        if event["type"] not in [
            "checkout.session.completed",
            "checkout.session.expired",
            "checkout.session.async_payment_succeeded",
            "checkout.session.async_payment_failed",
        ]:
            return Response({"ignorado": True})
        try:
            session = stripe.checkout.Session.retrieve(
                event["data"]["object"]["id"], api_key=settings.STRIPE_SECRET_KEY
            )
            session = session if isinstance(session, dict) else session.to_dict()
            return Response(ops.process_event(event, session))
        except stripe.StripeError:
            return Response(
                {"detail": "No se pudo verificar la sesión con Stripe."}, status=502
            )
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc


class MonedaView(Mutation):
    roles = ["ADMIN"]
    form = forms.Moneda
    operation = staticmethod(ops.confirm_currency)


class ConciliarView(APIView):
    permission_classes = [ClinicalRole]
    roles = ["ADMIN"]

    def post(self, request, pago):
        try:
            return Response(ops.reconcile(request, pago, {}))
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc


class AnularCheckoutView(ConciliarView):
    def post(self, request, pago):
        try:
            return Response(ops.reconcile(request, pago, {}, cancel=True))
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc
