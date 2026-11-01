from django.db import DatabaseError
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.clinica.views import ClinicalRole
from apps.laboratorio.views import ConflictoLaboratorio
from . import services as ops, serializers as forms


class Catalogo(APIView):
    permission_classes = [ClinicalRole]
    roles = ops.STAFF + ops.DONORS

    def get(self, request):
        return Response(ops.catalog(request))


class Create(APIView):
    permission_classes = [ClinicalRole]

    def post(self, request, **kwargs):
        serializer = self.form(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            return Response(self.operation(request, **kwargs, d=serializer.validated_data), status=201)
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc


class Turnos(Create):
    roles = ['ADMIN']
    form = forms.Turno
    operation = staticmethod(ops.create_slot)


class Citas(Create):
    roles = ops.STAFF + ops.DONORS
    form = forms.Cita
    operation = staticmethod(ops.create_appointment)


class Reprogramar(Create):
    roles = ops.STAFF + ops.DONORS
    form = forms.Reprogramacion
    operation = staticmethod(ops.change_appointment)


class Cancelar(APIView):
    permission_classes = [ClinicalRole]
    roles = ops.STAFF + ops.DONORS

    def post(self, request, ident):
        try:
            return Response(ops.change_appointment(request, ident, {}, cancel=True))
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc


class Incentivos(Create):
    roles = ['ADMIN', 'PERS_COLECTA']
    form = forms.Incentivo
    operation = staticmethod(ops.incentives)

    def get(self, request):
        return Response(ops.incentives(request))


class ConfirmarRefrigerio(Create):
    roles = Incentivos.roles
    form = forms.Confirmacion
    operation = staticmethod(ops.confirm_refreshment)
