"""
Serializadores para la app Donantes (CU05) adaptados al modelo PosibleDonador / Donante.
"""
from rest_framework import serializers
from .models import Donante, PosibleDonador, ExtraccionDonacion

class ExtraccionItemSerializer(serializers.ModelSerializer):
    """
    Serializador resumen de extracciones para la línea de tiempo del carnet.
    """
    enfermeroPuncion = serializers.SerializerMethodField()
    modalidadDonacion = serializers.SerializerMethodField()

    class Meta:
        model = ExtraccionDonacion
        fields = [
            'idExtraccion',
            'codigoExtraccion',
            'fechaHora',
            'modalidadDonacion',
            'brazoExtraccion',
            'volumenExtraidoMl',
            'enfermeroPuncion',
        ]

    def get_enfermeroPuncion(self, obj):
        if obj.personalSalud and obj.personalSalud.persona:
            return obj.personalSalud.persona.nombreCompleto
        return 'Personal Autorizado'

    def get_modalidadDonacion(self, obj):
        return 'Sangre Total'


class PosibleDonadorResponseSerializer(serializers.Serializer):
    """
    Serializador para postulantes en estado inicial de Posible Donador (sin análisis serológico).
    """
    esPosibleDonador = serializers.BooleanField(default=True)
    ci = serializers.CharField()
    nombres = serializers.CharField()
    apellidos = serializers.CharField()
    donante = serializers.CharField()
    sexo = serializers.CharField()
    celular = serializers.CharField(allow_null=True)
    direccion = serializers.CharField(allow_null=True)
    ocupacion = serializers.CharField(allow_null=True)
    nacionalidad = serializers.CharField(default='Boliviana')
    estadoAptitud = serializers.CharField()
    tieneAnalisis = serializers.BooleanField()
    fechaRegistroPostulante = serializers.DateField()
    carnetProvisionalCodigo = serializers.CharField(allow_null=True, required=False)
    estaHabilitadoParaDonar = serializers.BooleanField(default=False)
    mensaje = serializers.CharField()


class CarnetDigitalResponseSerializer(serializers.Serializer):
    """
    Serializador que estructura la salida del Carnet Digital (CU05)
    para donantes calificados que superaron el tamizaje serológico.
    """
    esPosibleDonador = serializers.BooleanField(default=False)
    carnetDigitalCodigo = serializers.CharField()
    ci = serializers.CharField()
    nombres = serializers.CharField()
    apellidos = serializers.CharField()
    donante = serializers.CharField()
    sexo = serializers.CharField()
    celular = serializers.CharField(allow_null=True)
    direccion = serializers.CharField(allow_null=True)
    ocupacion = serializers.CharField(allow_null=True)
    tipoDonante = serializers.CharField()
    estadoHabilitacion = serializers.CharField()
    fechaUltimaDonacion = serializers.DateField(allow_null=True)
    
    # Cálculos biológicos de Consulta C1
    periodoEsperaDias = serializers.IntegerField()
    fechaHabilitacionProxima = serializers.DateField(allow_null=True)
    diasRestantesEspera = serializers.IntegerField()
    estaHabilitadoParaDonar = serializers.BooleanField()
    
    # Agregados históricos de Consulta C3
    totalDonacionesHistoricas = serializers.IntegerField()
    volumenHistoricoAportadoMl = serializers.IntegerField()
    nacionalidad = serializers.CharField(default='Boliviana', allow_null=True)
    grupoSanguineo = serializers.CharField(default='O', allow_null=True)
    factorRh = serializers.CharField(default='Positivo', allow_null=True)

    # Historial de extracciones para el modal
    extraccionesRecientes = ExtraccionItemSerializer(many=True)
