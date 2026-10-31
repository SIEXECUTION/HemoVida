from decimal import Decimal
from rest_framework import serializers as s


class Deuda(s.Serializer):
    idsolicitud = s.IntegerField(min_value=1)
    montooriginal = s.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01")
    )
    motivodeuda = s.CharField(max_length=2000)
    fechavencimiento = s.DateTimeField(required=False)
    pagoposteriorautorizado = s.BooleanField(default=False)
    observacionautorizacion = s.CharField(
        max_length=2000, required=False, allow_blank=True
    )

    def validate(self, d):
        if (
            d.get("pagoposteriorautorizado")
            and not d.get("observacionautorizacion", "").strip()
        ):
            raise s.ValidationError(
                "Indica el motivo de la autorización de pago posterior."
            )
        return d


class Moneda(s.Serializer):
    confirmada = s.BooleanField()

    def validate_confirmada(self, value):
        if not value:
            raise s.ValidationError("Confirma la moneda original de la obligación.")
        return value


class Pago(s.Serializer):
    montopagado = s.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01")
    )
    metodopago = s.ChoiceField(
        choices=["Efectivo", "Deposito", "Transferencia QR", "Transferencia bancaria"]
    )
    referenciaexterna = s.CharField(max_length=150)


class Intento(s.Serializer):
    montopagado = s.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        max_value=Decimal("999999.99"),
    )
    idempotencia = s.UUIDField()


class Tratamiento(s.Serializer):
    estadopago = s.ChoiceField(choices=["Exonerado SUS", "Convenio Institucional"])
    conceptoservicio = s.CharField(max_length=150)
    numerorecibofactura = s.CharField(max_length=35)
