from uuid import uuid4
from contextlib import contextmanager
from django.conf import settings
from django.db import connection, transaction
from rest_framework.exceptions import ValidationError, APIException
from apps.clinica.services import one, rows, audit, revision07, clinical_operation
import stripe


def unavailable(message):
    e = APIException(message)
    e.status_code = 503
    raise e


def available():
    if settings.STRIPE_MODE not in ["test", "live"]:
        unavailable("STRIPE_MODE debe ser test o live.")
    key = settings.STRIPE_SECRET_KEY
    if not key or not settings.STRIPE_WEBHOOK_SECRET:
        unavailable("Configura las claves de Stripe en el backend.")
    expected = "sk_live_" if settings.STRIPE_MODE == "live" else "sk_test_"
    if not key.startswith(expected):
        raise ValidationError("La clave no coincide con STRIPE_MODE.")


def create_debt(request, d):
    with clinical_operation(request), connection.cursor() as c:
        revision07(c)
        one(
            c,
            "SELECT idsolicitud FROM solicitudhospitalaria WHERE idsolicitud=%s FOR UPDATE",
            [d["idsolicitud"]],
        )
        c.execute(
            "SELECT 1 FROM comprobantepago WHERE idsolicitud=%s AND estadopago IN ('Exonerado SUS','Convenio Institucional')",
            [d["idsolicitud"]],
        )
        if c.fetchone():
            raise ValidationError(
                "La solicitud ya tiene un tratamiento administrativo; requiere revisión."
            )
        r = one(
            c,
            "INSERT INTO deudafinanciera(idsolicitud,montooriginal,motivodeuda,fechavencimiento,pagoposteriorautorizado,autorizadopor,observacionautorizacion,moneda) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            [
                d["idsolicitud"],
                d["montooriginal"],
                d["motivodeuda"],
                d.get("fechavencimiento"),
                d["pagoposteriorautorizado"],
                request.user.idUsuario if d["pagoposteriorautorizado"] else None,
                d.get("observacionautorizacion", ""),
                "BOB",
            ],
        )
        audit(
            c, request, "deudafinanciera", r["iddeuda"], "CU22 obligación creada en BOB"
        )
        return r


def debt(c, pk):
    revision07(c)
    d = one(c, "SELECT * FROM deudafinanciera WHERE iddeuda=%s FOR UPDATE", [pk])
    if d["moneda"] != "BOB":
        raise ValidationError(
            "La deuda no tiene moneda BOB confirmada; requiere revisión."
        )
    return d


def receipt(c, p):
    d = one(c, "SELECT * FROM deudafinanciera WHERE iddeuda=%s", [p["iddeuda"]])
    if d["saldopendiente"] == 0:
        c.execute("SELECT 1 FROM comprobantepago WHERE iddeuda=%s", [d["iddeuda"]])
        if not c.fetchone():
            c.execute(
                "INSERT INTO comprobantepago(idsolicitud,numerorecibofactura,conceptoservicio,montototal,estadopago,metodopago,fechahorapago,iddeuda) VALUES(%s,%s,'Servicios de procesamiento y laboratorio',%s,'Pagado',%s,CURRENT_TIMESTAMP,%s)",
                [
                    d["idsolicitud"],
                    "REC-" + uuid4().hex[:30],
                    d["montooriginal"],
                    p["metodopago"],
                    d["iddeuda"],
                ],
            )


def manual_payment(request, deuda, d):
    with clinical_operation(request), connection.cursor() as c:
        row = debt(c, deuda)
        c.execute(
            "SELECT * FROM pagofinanciero WHERE proveedorpasarela='Manual' AND referenciaexterna=%s",
            [d["referenciaexterna"]],
        )
        prior = c.fetchone()
        if prior:
            p = dict(zip([x[0] for x in c.description], prior))
            if (
                p["iddeuda"] != deuda
                or p["montopagado"] != d["montopagado"]
                or p["metodopago"] != d["metodopago"]
            ):
                raise ValidationError("Referencia utilizada con otros datos.")
            return p
        c.execute(
            "SELECT 1 FROM pagofinanciero WHERE iddeuda=%s AND proveedorpasarela='Stripe' AND estadotransaccion='Pendiente'",
            [deuda],
        )
        if c.fetchone():
            raise ValidationError(
                "Hay un checkout de Stripe pendiente: concilia o anula ese intento antes de registrar otro abono."
            )
        if d["montopagado"] > row["saldopendiente"]:
            raise ValidationError("El abono excede el saldo.")
        p = one(
            c,
            "INSERT INTO pagofinanciero(iddeuda,montopagado,metodopago,estadotransaccion,referenciaexterna,proveedorpasarela,fechahorapago) VALUES(%s,%s,%s,'Confirmada',%s,'Manual',now()) RETURNING *",
            [deuda, d["montopagado"], d["metodopago"], d["referenciaexterna"]],
        )
        receipt(c, p)
        return p


def checkout(request, deuda, d):
    available()
    with clinical_operation(request), connection.cursor() as c:
        row = debt(c, deuda)
        c.execute(
            "SELECT s.*,p.iddeuda,p.montopagado FROM checkoutstripe s JOIN pagofinanciero p USING(idpago) WHERE idempotencia=%s FOR UPDATE",
            [d["idempotencia"]],
        )
        found = c.fetchone()
        if found:
            attempt = dict(zip([x[0] for x in c.description], found))
            if (
                attempt["iddeuda"] != deuda
                or attempt["montopagado"] != d["montopagado"]
                or attempt["idusuario"] != request.user.idUsuario
            ):
                raise ValidationError(
                    "Clave de idempotencia utilizada para otro intento."
                )
        else:
            if d["montopagado"] > row["saldopendiente"]:
                raise ValidationError("El importe excede el saldo.")
            c.execute(
                "SELECT 1 FROM checkoutstripe s JOIN pagofinanciero p USING(idpago) WHERE p.iddeuda=%s AND p.estadotransaccion='Pendiente'",
                [deuda],
            )
            if c.fetchone():
                raise ValidationError(
                    "Hay un checkout pendiente; reintenta con su clave o concilia su estado."
                )
            p = one(
                c,
                "INSERT INTO pagofinanciero(iddeuda,montopagado,metodopago,proveedorpasarela) VALUES(%s,%s,'Tarjeta','Stripe') RETURNING idpago",
                [deuda, d["montopagado"]],
            )
            attempt = one(
                c,
                "INSERT INTO checkoutstripe(idpago,idempotencia,moneda,monto,idusuario) VALUES(%s,%s,%s,%s,%s) RETURNING *",
                [
                    p["idpago"],
                    d["idempotencia"],
                    "bob",
                    int(d["montopagado"] * 100),
                    request.user.idUsuario,
                ],
            )
        c.execute(
            "SELECT estadotransaccion FROM pagofinanciero WHERE idpago=%s",
            [attempt["idpago"]],
        )
        if c.fetchone()[0] != "Pendiente":
            raise ValidationError(
                "Este intento ya finalizó; consulta el historial de pagos."
            )
        if attempt["urlcheckout"]:
            return attempt
        # Stripe puede eliminar las claves después de 24 horas. No volver a
        # crear una sesión incierta cuando el proveedor ya podría olvidarla.
        from django.utils import timezone
        from datetime import timedelta

        if timezone.now() - attempt["fechacreacion"] >= timedelta(hours=23):
            raise ValidationError(
                "Intento sin sesión con más de 23 horas: requiere revisión en Stripe antes de cualquier nuevo cobro."
            )
    try:
        session = stripe.checkout.Session.create(
            api_key=settings.STRIPE_SECRET_KEY,
            idempotency_key=str(d["idempotencia"]),
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "bob",
                        "unit_amount": attempt["monto"],
                        "product_data": {"name": "Servicios de procesamiento HemoVida"},
                    },
                    "quantity": 1,
                }
            ],
            client_reference_id=str(attempt["idpago"]),
            metadata={"idpago": str(attempt["idpago"])},
            success_url=settings.PAYMENT_FRONTEND_URL + "/?pago=pendiente",
            cancel_url=settings.PAYMENT_FRONTEND_URL + "/?pago=cancelado",
        )
    except stripe.InvalidRequestError:
        # Un rechazo de parámetros no creó la sesión. Permite corregir el
        # importe con otro intento; los errores de red mantienen el original.
        with clinical_operation(request), connection.cursor() as c:
            debt(c, deuda)
            c.execute(
                "UPDATE pagofinanciero SET estadotransaccion='Rechazada',observaciones='Stripe rechazó los parámetros del checkout; no se creó una sesión.' WHERE idpago=%s AND estadotransaccion='Pendiente'",
                [attempt["idpago"]],
            )
        raise ValidationError(
            "Stripe rechazó el importe o los parámetros del checkout. Revisa los límites de cobro y crea otro intento."
        )
    except stripe.StripeError:
        e = APIException(
            "Stripe no confirmó el checkout. Reintenta con la misma clave."
        )
        e.status_code = 502
        raise e
    with clinical_operation(request), connection.cursor() as c:
        debt(c, deuda)
        c.execute(
            "UPDATE pagofinanciero SET referenciaexterna=%s WHERE idpago=%s AND referenciaexterna IS NULL",
            [session.id, attempt["idpago"]],
        )
        return one(
            c,
            "UPDATE checkoutstripe SET sesionid=%s,urlcheckout=%s WHERE idpago=%s RETURNING *",
            [session.id, session.url, attempt["idpago"]],
        )


@contextmanager
def webhook_context():
    with transaction.atomic(), connection.cursor() as c:
        for key, value in [
            ("hemovida.origen", "stripe_webhook"),
            ("hemovida.rol_activo", "Stripe verificado"),
            ("hemovida.usuario_id", ""),
        ]:
            c.execute("SELECT set_config(%s,%s,true)", [key, value])
        yield c


def process_event(event, session):
    with webhook_context() as c:
        revision07(c)
        c.execute(
            "SELECT p.iddeuda FROM checkoutstripe s JOIN pagofinanciero p USING(idpago) WHERE s.sesionid=%s",
            [session["id"]],
        )
        r = c.fetchone()
        if not r:
            raise ValidationError(
                "Sesión sin intento local. Reintente la notificación."
            )
        debt(c, r[0])
        attempt = one(
            c,
            "SELECT s.*,p.estadotransaccion,p.iddeuda,p.metodopago,p.montopagado FROM checkoutstripe s JOIN pagofinanciero p USING(idpago) WHERE s.sesionid=%s FOR UPDATE",
            [session["id"]],
        )
        c.execute("SELECT 1 FROM eventostripe WHERE idevento=%s", [event["id"]])
        if c.fetchone():
            return {"recibido": True, "repetido": True}
        if (
            session.get("currency") != attempt["moneda"]
            or session.get("amount_total") != attempt["monto"]
            or session.get("client_reference_id") != str(attempt["idpago"])
        ):
            raise ValidationError("Importe, moneda o referencia no coinciden.")
        status = None
        if session.get("payment_status") == "paid":
            status = "Confirmada"
        elif session.get("status") == "expired":
            status = "Anulada"
        elif event["type"] == "checkout.session.async_payment_failed":
            status = "Rechazada"
        result = status or "Pendiente"
        if status == "Confirmada" and attempt["estadotransaccion"] != "Confirmada":
            current = one(
                c,
                "SELECT saldopendiente FROM deudafinanciera WHERE iddeuda=%s",
                [attempt["iddeuda"]],
            )
            if attempt["montopagado"] > current["saldopendiente"]:
                result = "RequiereConciliacion"
                c.execute(
                    "UPDATE pagofinanciero SET observaciones='Stripe confirma recepción de fondos; importe superior al saldo. Requiere conciliación administrativa.' WHERE idpago=%s",
                    [attempt["idpago"]],
                )
            else:
                c.execute(
                    "UPDATE pagofinanciero SET estadotransaccion='Confirmada',fechahorapago=now() WHERE idpago=%s",
                    [attempt["idpago"]],
                )
                receipt(c, attempt)
        elif (
            status in ["Anulada", "Rechazada"]
            and attempt["estadotransaccion"] == "Pendiente"
        ):
            c.execute(
                "UPDATE pagofinanciero SET estadotransaccion=%s WHERE idpago=%s",
                [status, attempt["idpago"]],
            )
        c.execute(
            "INSERT INTO eventostripe(idevento,tipo,sesionid,idpago,resultado) VALUES(%s,%s,%s,%s,%s)",
            [
                event["id"],
                event["type"],
                session["id"],
                attempt["idpago"],
                result,
            ],
        )
        return {
            "recibido": True,
            "requiere_conciliacion": result == "RequiereConciliacion",
        }


def treatment(request, solicitud, d):
    with clinical_operation(request), connection.cursor() as c:
        one(
            c,
            "SELECT idsolicitud FROM solicitudhospitalaria WHERE idsolicitud=%s FOR UPDATE",
            [solicitud],
        )
        c.execute("SELECT 1 FROM deudafinanciera WHERE idsolicitud=%s", [solicitud])
        if c.fetchone():
            raise ValidationError(
                "La solicitud ya tiene obligación; requiere revisión administrativa."
            )
        r = one(
            c,
            "INSERT INTO comprobantepago(idsolicitud,numerorecibofactura,conceptoservicio,montototal,estadopago,metodopago) VALUES(%s,%s,%s,0,%s,%s) RETURNING *",
            [
                solicitud,
                d["numerorecibofactura"],
                d["conceptoservicio"],
                d["estadopago"],
                d["estadopago"],
            ],
        )
        audit(
            c,
            request,
            "comprobantepago",
            r["idcomprobante"],
            "CU22 tratamiento administrativo sin ingreso",
        )
        return r


def confirm_currency(request, deuda, d):
    with clinical_operation(request), connection.cursor() as c:
        revision07(c)
        row = one(
            c, "SELECT moneda FROM deudafinanciera WHERE iddeuda=%s FOR UPDATE", [deuda]
        )
        if row["moneda"] not in [None, "BOB"]:
            raise ValidationError(
                "La obligación registra otra moneda; no se convierte automáticamente."
            )
        c.execute("UPDATE deudafinanciera SET moneda='BOB' WHERE iddeuda=%s", [deuda])
        audit(
            c,
            request,
            "deudafinanciera",
            deuda,
            "CU22 administrador confirmó moneda original BOB sin conversión de importes",
        )
        return {"iddeuda": deuda, "moneda": "BOB"}


def reconcile(request, pago, d, cancel=False):
    available()
    with connection.cursor() as c:
        a = one(
            c,
            "SELECT s.*,p.iddeuda FROM checkoutstripe s JOIN pagofinanciero p USING(idpago) WHERE idpago=%s",
            [pago],
        )
    if not a["sesionid"]:
        raise ValidationError(
            "El checkout todavía no tiene sesión: reintenta la creación con su misma clave."
        )
    try:
        session = stripe.checkout.Session.retrieve(
            a["sesionid"], api_key=settings.STRIPE_SECRET_KEY
        )
        session = session if isinstance(session, dict) else session.to_dict()
        if cancel and session.get("status") == "open":
            session = stripe.checkout.Session.expire(
                a["sesionid"], api_key=settings.STRIPE_SECRET_KEY
            )
        session = session if isinstance(session, dict) else session.to_dict()
    except stripe.StripeError:
        e = APIException(
            "No se pudo consultar el estado de Stripe. El intento no cambió."
        )
        e.status_code = 502
        raise e
    import hashlib

    state = f"{session.get('payment_status')}:{session.get('status')}"
    event = {
        "id": "reconcile_"
        + hashlib.sha256((a["sesionid"] + state).encode()).hexdigest(),
        "type": "checkout.session.reconciled",
    }
    result = process_event(event, session)
    with clinical_operation(request), connection.cursor() as c:
        audit(
            c,
            request,
            "pagofinanciero",
            pago,
            "CU22 conciliación contra sesión Stripe verificada",
        )
    return result
