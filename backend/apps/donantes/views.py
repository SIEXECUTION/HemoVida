"""
Vistas de API REST para la app Donantes (CU05)
con soporte para Donante Calificado (con QR) y Posible Donador (sin análisis).
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
from django.shortcuts import get_object_or_404

from .models import Donante, PosibleDonador, ExtraccionDonacion
from .serializers import CarnetDigitalResponseSerializer, PosibleDonadorResponseSerializer
from apps.seguridad.models import Persona

class DonanteCarnetDigitalView(APIView):
    """
    Endpoint: GET /api/donantes/<ci>/carnet/
    Caso de Uso [CU05]: Consultar Carnet Digital e Historial Biológico del Donante.
    Permite la búsqueda por C.I. o código de carnet (HEMO-YYYY-XXXX).
    Si el usuario aún es 'Posible Donador', devuelve su estado de aptitud y falta de análisis serológico.
    """
    permission_classes = [AllowAny]

    def get(self, request, ci):
        query = ci.strip()
        query_hyphen = query.replace(' ', '-').replace('_', '-')
        query_spaced = query.replace('-', ' ')
        query_digits = ''.join(c for c in query if c.isdigit())
        
        # 1. Búsqueda en Donante Calificado (superó Inmunoserología)
        donante_filter = (
            Q(persona__ci__iexact=query) |
            Q(persona__ci__iexact=query_hyphen) |
            Q(carnetDigitalCodigo__iexact=query) |
            Q(carnetDigitalCodigo__iexact=query_hyphen) |
            Q(carnetDigitalCodigo__iexact=query_spaced)
        )
        if len(query_digits) >= 4:
            donante_filter |= Q(persona__ci__icontains=query_digits) | Q(carnetDigitalCodigo__icontains=query_digits)

        donante = Donante.objects.select_related('persona').filter(donante_filter).first()

        if donante:
            persona = donante.persona
            sexo = (persona.sexo or 'M').upper()
            fecha_ultima = donante.fechaUltimaDonacion
            hoy = date.today()

            # REGLA BIOLÓGICA (CONSULTA C1):
            # Varones (M): 90 días de intervalo biológico entre donaciones.
            # Mujeres (F) y otros: 120 días de intervalo biológico de recuperación.
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

            # HISTORIAL ACUMULADO (CONSULTA C3):
            extracciones_qs = ExtraccionDonacion.objects.filter(
                personaDonante=persona
            ).select_related('personalSalud__persona').order_by('-fechaHora')

            agregados = extracciones_qs.aggregate(
                total_donaciones=Count('idExtraccion'),
                volumen_total=Sum('volumenExtraidoMl')
            )
            total_donaciones = agregados['total_donaciones'] or 0
            volumen_total = agregados['volumen_total'] or 0

            payload = {
                'esPosibleDonador': False,
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

        # 2. Búsqueda en PosibleDonador (Postulante en fase inicial sin serología)
        posible_filter = (
            Q(persona__ci__iexact=query) |
            Q(persona__ci__iexact=query_hyphen) |
            Q(persona__usuario__username__iexact=query) |
            Q(persona__usuario__username__iexact=query_hyphen)
        )
        if len(query_digits) >= 4:
            posible_filter |= (
                Q(persona__ci__icontains=query_digits) |
                Q(persona__usuario__username__icontains=query_digits)
            )

        posible = PosibleDonador.objects.select_related('persona').filter(posible_filter).first()

        if posible:
            persona = posible.persona
            payload_posible = {
                'esPosibleDonador': True,
                'ci': persona.ci,
                'nombres': persona.nombres,
                'apellidos': persona.apellidos,
                'donante': persona.nombreCompleto,
                'sexo': persona.sexo,
                'celular': persona.celular,
                'direccion': persona.direccion,
                'ocupacion': persona.ocupacion,
                'nacionalidad': getattr(persona, 'nacionalidad', 'Boliviana') or 'Boliviana',
                'estadoAptitud': posible.estadoAptitud,
                'tieneAnalisis': posible.tieneAnalisis,
                'fechaRegistroPostulante': posible.fechaRegistroPostulante,
                'estaHabilitadoParaDonar': False,
                'mensaje': 'Postulante en fase de registro y cuestionario de prefiltro. Aún sin análisis serológico validado.'
            }
            serializer = PosibleDonadorResponseSerializer(payload_posible)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response({
            "detail": f"No se encontró ningún donante ni postulante registrado con C.I. o código '{ci}'."
        }, status=status.HTTP_404_NOT_FOUND)
