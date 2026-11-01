from rest_framework import serializers as s


class Turno(s.Serializer):
    fecha = s.DateField()


class Respuesta(s.Serializer):
    idrequisito = s.IntegerField(min_value=1)
    cumple = s.BooleanField()
    observacion = s.CharField(max_length=200, required=False, allow_blank=True)


class Cita(s.Serializer):
    idpersona = s.IntegerField(min_value=1, required=False)
    idturno = s.IntegerField(min_value=1)
    tipoatencion = s.ChoiceField(choices=["Evaluacion", "Donacion", "Autologa"])
    idprograma = s.IntegerField(min_value=1, required=False)
    versioncatalogo = s.CharField(max_length=64)
    respuestas = Respuesta(many=True, allow_empty=False, max_length=200)


class Reprogramacion(s.Serializer):
    idturno = s.IntegerField(min_value=1)


class Incentivo(s.Serializer):
    idextraccion = s.IntegerField(min_value=1)
    refrigerioentregado = s.BooleanField()
    tipoarticulo = s.CharField(max_length=80)


class Confirmacion(s.Serializer):
    confirmada = s.BooleanField()

    def validate_confirmada(self, value):
        if not value:
            raise s.ValidationError("Confirma la entrega efectivamente realizada.")
        return value


class Programa(s.Serializer):
    idreceptor = s.IntegerField(min_value=1)
    fechacirugia = s.DateField()
    indicacion = s.CharField(min_length=10, max_length=4000)
    referenciamedica = s.CharField(max_length=120)


class RevisionPrograma(s.Serializer):
    version = s.IntegerField(min_value=1)
    accion = s.ChoiceField(choices=["Modificar", "Aprobar", "Cancelar", "Cerrar"])
    motivo = s.CharField(min_length=10, max_length=500)
    fechacirugia = s.DateField(required=False)
    indicacion = s.CharField(min_length=10, max_length=4000, required=False)
    referenciamedica = s.CharField(max_length=120, required=False)
    confirmada = s.BooleanField(default=False)

    def validate(self, d):
        if d["accion"] == "Modificar" and not all(
            k in d for k in ["fechacirugia", "indicacion", "referenciamedica"]
        ):
            raise s.ValidationError(
                "Modificar exige fecha, indicación y referencia médica completas."
            )
        if d["accion"] != "Modificar" and not d["confirmada"]:
            raise s.ValidationError(
                "Confirma la revisión profesional antes de aprobar, cancelar o cerrar."
            )
        return d


class Cierre(s.Serializer):
    fecha = s.DateField()
    cerrado = s.BooleanField()
    motivo = s.CharField(min_length=10, max_length=250)


class Requisito(s.Serializer):
    nombrerequisito = s.CharField(max_length=120)
    tiporequisito = s.CharField(max_length=40)
    esexcluyentedefinitivo = s.BooleanField()
    activo = s.BooleanField(default=True)


class Borrador(Cita):
    idturno = s.IntegerField(min_value=1, required=False, allow_null=True)
    respuestas = Respuesta(many=True, allow_empty=True, max_length=200)


class Presencial(Cita):
    autorizada = s.BooleanField()
    motivo = s.CharField(min_length=10, max_length=250)

    def validate_autorizada(self, v):
        if not v:
            raise s.ValidationError("Confirma la autorización y presencia física.")
        return v
