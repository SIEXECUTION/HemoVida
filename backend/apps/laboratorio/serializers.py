from rest_framework import serializers


class SerologiaSerializer(serializers.Serializer):
    codigoanalisis = serializers.CharField(max_length=30)
    resultadovih = serializers.ChoiceField(choices=['No Reactivo', 'Reactivo', 'Indeterminado'])
    resultadochagas = serializers.ChoiceField(choices=['No Reactivo', 'Reactivo', 'Indeterminado'])
    resultadohepatitisb = serializers.ChoiceField(choices=['No Reactivo', 'Reactivo', 'Indeterminado'])
    resultadohepatitisc = serializers.ChoiceField(choices=['No Reactivo', 'Reactivo', 'Indeterminado'])
    resultadosifilis = serializers.ChoiceField(choices=['No Reactivo', 'Reactivo', 'Indeterminado'])
    resultadohtlv = serializers.ChoiceField(choices=['No Reactivo', 'Reactivo', 'Indeterminado'])
    dictamenfinal = serializers.ChoiceField(choices=['Apto', 'No Apto'])

    def validate(self, attrs):
        if attrs['dictamenfinal'] == 'Apto' and any(
            attrs[k] != 'No Reactivo' for k in attrs if k.startswith('resultado')
        ):
            raise serializers.ValidationError('Un dictamen apto requiere los seis marcadores no reactivos.')
        return attrs


class HematologiaSerializer(serializers.Serializer):
    grupoaboconfirmado = serializers.ChoiceField(choices=['A', 'B', 'AB', 'O'])
    factorrhconfirmado = serializers.ChoiceField(choices=['Positivo', 'Negativo'])
    pruebacoombsdirecta = serializers.CharField(max_length=30)
    pruebacoombsindirecta = serializers.CharField(max_length=30)
    rastreoanticuerposirregulares = serializers.CharField(max_length=100)
    dictameninmunohematologico = serializers.ChoiceField(choices=['Apto', 'No Apto', 'Pendiente'])
    observaciones = serializers.CharField(required=False, allow_blank=True, default='')
