from django.db import DatabaseError, connection
from rest_framework import permissions, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import SerologiaSerializer, HematologiaSerializer
from .services import guardar_analisis, liberar_lote
from .serializers import CorreccionGrupoSerializer
from .corrections import correct_group


class RolLaboratorio(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or request.user.estado != 'Activo':
            return False
        rol = request.auth.get('rolActivo') if request.auth else None
        return rol in ('BIOQ_INTEGRAL', 'ADMIN') and request.user.roles.filter(codigoRol=rol).exists()


class ConflictoLaboratorio(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'No se completó la operación. Revise los datos y el estado del lote; si hubo concurrencia, reintente.'


class SoloBioquimico(RolLaboratorio):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.auth.get('rolActivo') == 'BIOQ_INTEGRAL'


class AnalisisView(APIView):
    permission_classes = [RolLaboratorio]

    def guardar(self, request, madre, tipo, analisis_id=None):
        serializer = (SerologiaSerializer if tipo == 'serologia' else HematologiaSerializer)(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ident = guardar_analisis(request, madre, tipo, serializer.validated_data, analisis_id)
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc
        return Response({'id': ident, 'idunidadmadre': madre}, status=201 if analisis_id is None else 200)

    def post(self, request, madre, tipo):
        return self.guardar(request, madre, tipo)

    def put(self, request, madre, tipo, analisis_id):
        return self.guardar(request, madre, tipo, analisis_id)


class LiberarView(APIView):
    permission_classes = [RolLaboratorio]

    def post(self, request, madre):
        try:
            ids = liberar_lote(request, madre)
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc
        return Response({'idunidadmadre': madre, 'componentes_liberados': ids})


class CorreccionGrupoView(APIView):
    permission_classes = [SoloBioquimico]
    roles = ['BIOQ_INTEGRAL']

    def post(self, request, madre):
        form = CorreccionGrupoSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        try:
            return Response(correct_group(request, madre, form.validated_data))
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc


class LotesView(APIView):
    permission_classes = [RolLaboratorio]

    def get(self, request, madre=None):
        if connection.vendor != 'postgresql':
            return Response({'detail': 'Se requiere PostgreSQL.'}, status=503)
        try:
            with connection.cursor() as cursor:
                if madre is None:
                    cursor.execute('SELECT idunidadmadre,codigobolsamadre,estadoliberacion FROM public.unidadsangretotal ORDER BY idunidadmadre DESC LIMIT 100')
                    return Response([dict(zip(['id', 'codigo', 'estado'], r)) for r in cursor.fetchall()])
                cursor.execute('SELECT m.idunidadmadre,m.codigobolsamadre,m.estadoliberacion,m.idgrupo,g.grupoabo,g.factorrh FROM public.unidadsangretotal m JOIN public.gruposanguineo g USING(idgrupo) WHERE m.idunidadmadre=%s', [madre])
                row = cursor.fetchone()
                if not row:
                    return Response({'detail': 'Bolsa madre inexistente.'}, status=404)
                result = dict(zip(['id', 'codigo', 'estado', 'idgrupo', 'grupoabo', 'factorrh'], row))
                for key, table, pk, extra in [
                    ('serologia', 'analisisinmunoserologico', 'idanalisis', ''),
                    ('hematologia', 'analisisinmunohematologico', 'idanalisishematologico', " AND etapaanalisis='Post-Extraccion'"),
                ]:
                    cursor.execute(f'SELECT * FROM public.{table} WHERE idunidadmadre=%s{extra} ORDER BY fechaanalisis DESC,{pk} DESC LIMIT 1', [madre])
                    item = cursor.fetchone()
                    result[key] = dict(zip([d[0] for d in cursor.description], item)) if item else None
                cursor.execute('SELECT public.hemo_lote_aprobado(%s)', [madre])
                result['analisis_aprobados'] = cursor.fetchone()[0]
                cursor.execute('SELECT idejemplarbolsa,codigoejemplark,estadobolsak,esexclusivoautologo FROM public.ejemplarbolsa WHERE idunidadmadre=%s ORDER BY idejemplarbolsa', [madre])
                result['componentes'] = [dict(zip(['id', 'codigo', 'estado', 'autologo'], r)) for r in cursor.fetchall()]
                return Response(result)
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc
