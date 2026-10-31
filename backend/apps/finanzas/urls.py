from django.urls import path
from .views import *

urlpatterns = [
    path("deudas/<int:deuda>/moneda/", MonedaView.as_view()),
    path("pagos/<int:pago>/conciliar/", ConciliarView.as_view()),
    path("pagos/<int:pago>/anular-checkout/", AnularCheckoutView.as_view()),
    path("catalogo/", Catalogo.as_view()),
    path("deudas/", DeudaView.as_view()),
    path("deudas/<int:deuda>/abonos/", PagoView.as_view()),
    path("deudas/<int:deuda>/checkout/", CheckoutView.as_view()),
    path("solicitudes/<int:solicitud>/tratamiento/", TratamientoView.as_view()),
    path("stripe/webhook/", StripeWebhook.as_view()),
]
