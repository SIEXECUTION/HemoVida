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
    tipoatencion = s.ChoiceField(choices=['Evaluacion', 'Donacion'])
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
            raise s.ValidationError('Confirma la entrega efectivamente realizada.')
        return value

