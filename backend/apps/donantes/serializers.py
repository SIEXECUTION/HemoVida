"""
Serializadores para la app Donantes (CU05).
"""
from rest_framework import serializers
from datetime import date, timedelta
from .models import Donante, ExtraccionDonacion

class ExtraccionItemSerializer(serializers.ModelSerializer):
    """
    Serializador resumen de extracciones para la línea de tiempo del carnet.
    """
    enfermeroPuncion = serializers.SerializerMethodField()

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


class CarnetDigitalResponseSerializer(serializers.Serializer):
    """
    Serializador que estructura la salida del Carnet Digital (CU05)
    para el componente React 'DigitalCardModal'.
    Integra Consulta C1 (biometría y días de espera) y Consulta C3 (histórico acumulado).
    """
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
