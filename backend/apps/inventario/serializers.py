"""
Serializadores para la app Inventario (CU04).
"""
from rest_framework import serializers
from .models import GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa

class GrupoSanguineoSerializer(serializers.ModelSerializer):
    tipificacion = serializers.CharField(read_only=True)

    class Meta:
        model = GrupoSanguineo
        fields = ['idGrupo', 'grupoABO', 'factorRh', 'tipificacion']


class ParametroStockMinimoSerializer(serializers.ModelSerializer):
    idGrupo = serializers.IntegerField(source='grupo.idGrupo', read_only=True)
    tipificacion = serializers.CharField(source='grupo.tipificacion', read_only=True)
    grupoABO = serializers.CharField(source='grupo.grupoABO', read_only=True)
    factorRh = serializers.CharField(source='grupo.factorRh', read_only=True)

    class Meta:
        model = ParametroStockMinimo
        fields = [
            'idParametro',
            'idGrupo',
            'tipificacion',
            'grupoABO',
            'factorRh',
            'tipoComponente',
            'stockMinimoSeguridad',
            'stockCriticoAlerta',
        ]
        read_only_fields = ['idParametro', 'idGrupo', 'tipoComponente']


class ParametroStockMinimoUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para actualizar umbrales de stock mínimo y crítico (PUT /api/stock/parametros/<id>/).
    """
    class Meta:
        model = ParametroStockMinimo
        fields = ['stockMinimoSeguridad', 'stockCriticoAlerta']

    def validate(self, attrs):
        stock_minimo = attrs.get('stockMinimoSeguridad', getattr(self.instance, 'stockMinimoSeguridad', 0))
        stock_critico = attrs.get('stockCriticoAlerta', getattr(self.instance, 'stockCriticoAlerta', 0))

        if stock_critico > stock_minimo:
            raise serializers.ValidationError({
                "stockCriticoAlerta": "El stock crítico de alerta no puede ser mayor que el stock mínimo de seguridad."
            })

        return attrs


class StockAlertaSerializer(serializers.Serializer):
    idParametro = serializers.IntegerField()
    idGrupo = serializers.IntegerField()
    tipificacion = serializers.CharField()
    tipoComponente = serializers.CharField()
    stockMinimoSeguridad = serializers.IntegerField()
    stockCriticoAlerta = serializers.IntegerField()
    stockDisponibleActual = serializers.IntegerField()
    deficitUnidades = serializers.IntegerField()
    nivelAlerta = serializers.CharField()
    requiereCampanaDonacion = serializers.BooleanField()
