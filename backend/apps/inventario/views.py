"""
Vistas de API REST para la app Inventario (CU04).
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import ParametroStockMinimo, EjemplarBolsa, GrupoSanguineo
from .serializers import (
    ParametroStockMinimoSerializer,
    ParametroStockMinimoUpdateSerializer,
    StockAlertaSerializer,
)
from apps.seguridad.permissions import IsAdminRole, IsHealthStaffRole
from apps.seguridad.utils import get_client_ip, registrar_auditoria

# ============================================================================
# [CU04] Parametrizar Umbrales de Stock Mínimo y Alertas Críticas
# ============================================================================
class ParametroStockMinimoListView(APIView):
    """
    Endpoint: GET /api/stock/parametros/
    Devuelve la lista de umbrales configurados para cada hemocomponente y grupo sanguíneo ABO/Rh.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = ParametroStockMinimo.objects.select_related('grupo').all()

        id_grupo = request.query_params.get('id_grupo')
        if id_grupo:
            queryset = queryset.filter(grupo__idGrupo=id_grupo)

        tipo_componente = request.query_params.get('tipo_componente')
        if tipo_componente:
            queryset = queryset.filter(tipoComponente__icontains=tipo_componente)

        serializer = ParametroStockMinimoSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ParametroStockMinimoUpdateView(APIView):
    """
    Endpoint: PUT /api/stock/parametros/<id>/
    Permite al Administrador actualizar los valores de stock mínimo de seguridad y alerta crítica.
    Audita la modificación en BitacoraAuditoria.
    """
    permission_classes = [IsAdminRole]

    @transaction.atomic
    def put(self, request, pk):
        parametro = get_object_or_404(ParametroStockMinimo.objects.select_related('grupo'), idParametro=pk)
        
        serializer = ParametroStockMinimoUpdateSerializer(parametro, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        min_anterior = parametro.stockMinimoSeguridad
        critico_anterior = parametro.stockCriticoAlerta

        parametro = serializer.save()

        # Registro en Bitácora de Auditoría
        ip_origen = get_client_ip(request)
        registrar_auditoria(
            usuario=request.user,
            accion=(
                f"Modificación de parámetro de stock para '{parametro.tipoComponente}' ({parametro.grupo.tipificacion}): "
                f"Mínimo ({min_anterior} -> {parametro.stockMinimoSeguridad}), "
                f"Crítico ({critico_anterior} -> {parametro.stockCriticoAlerta})"
            ),
            tabla='ParametroStockMinimo',
            idRegistroAfectado=parametro.idParametro,
            ip_origen=ip_origen
        )

        return Response({
            "message": "Parámetro de stock actualizado correctamente.",
            "parametro": ParametroStockMinimoSerializer(parametro).data
        }, status=status.HTTP_200_OK)


class StockAlertasListView(APIView):
    """
    Endpoint: GET /api/stock/alertas/
    Replicación estricta de la Subconsulta B4 / Consulta 20:
    Compara las bolsas en estado 'Disponible' en EjemplarBolsa contra ParametroStockMinimo
    y devuelve los grupos en déficit o alerta crítica.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mostrar_todos = request.query_params.get('todos', '').lower() in ('true', '1')

        # Recuperar todos los parámetros con sus grupos
        parametros = ParametroStockMinimo.objects.select_related('grupo').all()
        
        alertas = []
        for p in parametros:
            # Conteo de bolsas disponibles en inventario físico real
            disponibles = EjemplarBolsa.objects.filter(
                grupo=p.grupo,
                tipoComponente=p.tipoComponente,
                estadoBolsaK='Disponible'
            ).count()

            esta_en_deficit = disponibles < p.stockMinimoSeguridad

            # Si mostrar_todos es False, filtramos únicamente los que están en déficit (Subconsulta B4)
            if not mostrar_todos and not esta_en_deficit:
                continue

            deficit = max(0, p.stockMinimoSeguridad - disponibles)
            if disponibles <= p.stockCriticoAlerta:
                nivel_alerta = 'DEFICIT CRITICO'
                requiere_campana = True
            elif esta_en_deficit:
                nivel_alerta = 'DEFICIT SEGURIDAD'
                requiere_campana = False
            else:
                nivel_alerta = 'STOCK OPTIMO / NORMAL'
                requiere_campana = False

            alertas.append({
                'idParametro': p.idParametro,
                'idGrupo': p.grupo.idGrupo,
                'tipificacion': p.grupo.tipificacion,
                'tipoComponente': p.tipoComponente,
                'stockMinimoSeguridad': p.stockMinimoSeguridad,
                'stockCriticoAlerta': p.stockCriticoAlerta,
                'stockDisponibleActual': disponibles,
                'deficitUnidades': deficit,
                'nivelAlerta': nivel_alerta,
                'requiereCampanaDonacion': requiere_campana,
            })

        # Ordenar: primero los de déficit crítico, luego déficit seguridad
        prioridad_map = {'DEFICIT CRITICO': 1, 'DEFICIT SEGURIDAD': 2, 'STOCK OPTIMO / NORMAL': 3}
        alertas.sort(key=lambda x: (prioridad_map.get(x['nivelAlerta'], 4), -x['deficitUnidades']))

        serializer = StockAlertaSerializer(alertas, many=True)
        return Response({
            "totalAlertas": len([a for a in alertas if a['nivelAlerta'] != 'STOCK OPTIMO / NORMAL']),
            "alertas": serializer.data
        }, status=status.HTTP_200_OK)
