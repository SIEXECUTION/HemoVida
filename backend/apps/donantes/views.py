"""
Vistas de API REST para la app Donantes (CU05).
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
from django.shortcuts import get_object_or_404

from .models import Donante, ExtraccionDonacion
from .serializers import CarnetDigitalResponseSerializer

class DonanteCarnetDigitalView(APIView):
    """
    Endpoint: GET /api/donantes/<ci>/carnet/
    Caso de Uso [CU05]: Consultar Carnet Digital e Historial Biológico del Donante.
    Permite la búsqueda tanto por C.I. como por código de carnet (HV-DON-XXXX).
    """
    permission_classes = [AllowAny]

    def get(self, request, ci):
        query = ci.strip()
        donante = Donante.objects.select_related('persona').filter(
            Q(persona__ci__iexact=query) | Q(carnetDigitalCodigo__iexact=query)
        ).first()

        if not donante:
            return Response({
                "detail": f"No se encontró ningún donante registrado con C.I. o código '{ci}'."
            }, status=status.HTTP_404_NOT_FOUND)

        persona = donante.persona
        sexo = (persona.sexo or 'M').upper()
        fecha_ultima = donante.fechaUltimaDonacion
        hoy = date.today()

        # ---------------------------------------------------------------------
        # REGLA BIOLÓGICA (CONSULTA C1):
        # Varones (M): 90 días de intervalo biológico entre donaciones.
        # Mujeres (F) y otros: 120 días de intervalo biológico de recuperación.
        # ---------------------------------------------------------------------
        periodo_espera_dias = 90 if sexo == 'M' else 120

        if fecha_ultima:
            fecha_habilitacion = fecha_ultima + timedelta(days=periodo_espera_dias)
            delta_dias = (fecha_habilitacion - hoy).days
            dias_restantes_espera = max(0, delta_dias)
        else:
            fecha_habilitacion = None
            dias_restantes_espera = 0

        # Regla de aptitud: Requiere estado 'Apto' y haber cumplido los días biológicos de reposo
        esta_habilitado = (donante.estadoHabilitacion == 'Apto') and (dias_restantes_espera == 0)

        # ---------------------------------------------------------------------
        # HISTORIAL ACUMULADO (CONSULTA C3):
        # Conteo de extracciones históricas y volumen total aportado en ml.
        # ---------------------------------------------------------------------
        extracciones_qs = donante.extracciones.select_related('personalSalud__persona').order_by('-fechaHora')
        agregados = extracciones_qs.aggregate(
            total_donaciones=Count('idExtraccion'),
            volumen_total=Sum('volumenExtraidoMl')
        )
        total_donaciones = agregados['total_donaciones'] or 0
        volumen_total = agregados['volumen_total'] or 0

        # Armar respuesta estructurada para el DigitalCardModal de React
        payload = {
            'carnetDigitalCodigo': donante.carnetDigitalCodigo,
            'ci': persona.ci,
            'nombres': persona.nombres,
            'apellidos': persona.apellidos,
            'donante': persona.nombreCompleto,
            'sexo': persona.sexo,
            'celular': persona.celular,
            'direccion': persona.direccion,
            'ocupacion': persona.ocupacion,
            'tipoDonante': donante.tipoDonante,
            'estadoHabilitacion': donante.estadoHabilitacion,
            'fechaUltimaDonacion': fecha_ultima,
            'periodoEsperaDias': periodo_espera_dias,
            'fechaHabilitacionProxima': fecha_habilitacion,
            'diasRestantesEspera': dias_restantes_espera,
            'estaHabilitadoParaDonar': esta_habilitado,
            'totalDonacionesHistoricas': total_donaciones,
            'volumenHistoricoAportadoMl': volumen_total,
            'nacionalidad': getattr(persona, 'nacionalidad', 'Boliviana') or 'Boliviana',
            'grupoSanguineo': 'O',
            'factorRh': 'Positivo',
            'extraccionesRecientes': extracciones_qs[:10],
        }

        serializer = CarnetDigitalResponseSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)
