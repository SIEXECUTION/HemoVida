from rest_framework import serializers as s


class Triaje(s.Serializer):
    idpersona = s.IntegerField(min_value=1)
    idcita = s.IntegerField(min_value=1)
    pesokg = s.DecimalField(max_digits=5, decimal_places=2, min_value=1)
    presionsistolicammhg = s.IntegerField(min_value=1, max_value=300)
    presiondiastolicammhg = s.IntegerField(min_value=1, max_value=200)
    nivelhemoglobina = s.DecimalField(max_digits=4, decimal_places=1, min_value=1)
    temperatura = s.DecimalField(
        max_digits=4, decimal_places=1, min_value=30, max_value=45
    )
    resultadoaptitud = s.ChoiceField(choices=["Apto", "Rechazado"])

    def validate(self, d):
        if d["presiondiastolicammhg"] >= d["presionsistolicammhg"]:
            raise s.ValidationError("Presión diastólica debe ser menor que sistólica.")
        if d["resultadoaptitud"] == "Apto" and (
            d["pesokg"] < 50 or d["nivelhemoglobina"] < 12.5 or d["temperatura"] > 37.5
        ):
            raise s.ValidationError(
                "No cumple los criterios básicos del procedimiento institucional. Revise el dictamen."
            )
        return d


class Diferimiento(s.Serializer):
    idpersona = s.IntegerField(min_value=1)
    idtriaje = s.IntegerField(min_value=1)
    tipo = s.ChoiceField(choices=["Temporal", "Definitivo"])
    motivodetallado = s.CharField(max_length=255)
    diasinhabilitacion = s.IntegerField(min_value=0, max_value=36500, default=0)

    def validate(self, d):
        if (d["tipo"] == "Temporal") != (d["diasinhabilitacion"] > 0):
            raise s.ValidationError(
                "Temporal exige días positivos; definitivo exige cero días y fecha final nula."
            )
        return d


class Colecta(s.Serializer):
    idtriaje = s.IntegerField(min_value=1)
    idgrupo = s.IntegerField(min_value=1)
    brazoextraccion = s.ChoiceField(choices=["Izquierdo", "Derecho"])
    volumenextraidoml = s.IntegerField(min_value=300, max_value=9999)
    declaracionjuradaaceptada = s.BooleanField()
    firmadigital = s.CharField(max_length=100000)

    def validate_declaracionjuradaaceptada(self, value):
        if not value:
            raise s.ValidationError(
                "Debe aceptar el consentimiento antes de registrar la colecta."
            )
        return value


COMPONENTS = [
    "Concentrado de Globulos Rojos",
    "Paquete Globular",
    "Plasma Fresco Congelado",
    "Concentrado Plaquetario",
    "Crioprecipitado",
]


class Componente(s.Serializer):
    tipocomponente = s.ChoiceField(choices=COMPONENTS)
    volumenml = s.IntegerField(min_value=1)
    capacidadbolsaml = s.IntegerField(min_value=1)
    idubicacion = s.IntegerField(min_value=1)
    categoriaetaria = s.ChoiceField(choices=["Adulto", "Adolescente", "Pediátrico"])

    def validate(self, d):
        if d["volumenml"] > d["capacidadbolsaml"]:
            raise s.ValidationError("Volumen supera capacidad de bolsa.")
        return d


class Fraccionamiento(s.Serializer):
    componentes = Componente(many=True, allow_empty=False, max_length=20)


class Custodia(s.Serializer):
    idubicacion = s.IntegerField(min_value=1)


class Baja(s.Serializer):
    motivobaja = s.CharField(max_length=100)


class Admision(s.Serializer):
    idcita = s.IntegerField(min_value=1)
    idpersona = s.IntegerField(min_value=1)
