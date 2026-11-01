from django.db import DatabaseError
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.clinica.views import ClinicalRole
from apps.laboratorio.views import ConflictoLaboratorio
from . import services as ops, serializers as forms
from . import adjustments, autologous


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
            return Response(
                self.operation(request, **kwargs, d=serializer.validated_data),
                status=201,
            )
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc


class Turnos(Create):
    roles = ["ADMIN"]
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
    roles = ["ADMIN", "PERS_COLECTA"]
    form = forms.Incentivo
    operation = staticmethod(ops.incentives)

    def get(self, request):
        return Response(ops.incentives(request))


class ConfirmarRefrigerio(Create):
    roles = Incentivos.roles
    form = forms.Confirmacion
    operation = staticmethod(ops.confirm_refreshment)


class Programas(APIView):
    permission_classes = [ClinicalRole]
    roles = autologous.READERS

    def get(self, request):
        return Response(autologous.catalog(request))


class CrearPrograma(Create):
    roles = autologous.MEDICAL
    form = forms.Programa
    operation = staticmethod(autologous.create)


class HistorialPrograma(Programas):
    def get(self, request, ident):
        return Response(autologous.history(request, ident))


class RevisarPrograma(Create):
    roles = autologous.MEDICAL + autologous.REVIEWERS
    form = forms.RevisionPrograma
    operation = staticmethod(autologous.update)


class Cierres(Create):
    roles = ["ADMIN"]
    form = forms.Cierre
    operation = staticmethod(adjustments.close_day)


class Requisitos(Create):
    roles = ["ADMIN"]
    form = forms.Requisito
    operation = staticmethod(adjustments.requirement)

    def get(self, request):
        from django.db import connection

        with connection.cursor() as c:
            ops.ready(c)
            return Response(
                ops.rows(c, "SELECT * FROM requisitodonacion ORDER BY idrequisito")
            )


class Borrador(Create):
    roles = ops.STAFF + ops.DONORS
    form = forms.Borrador
    operation = staticmethod(adjustments.save_draft)

    def get(self, request):
        from django.db import connection
        from rest_framework.exceptions import ValidationError

        try:
            pid = int(request.query_params.get("idpersona", request.user.persona_id))
        except (TypeError, ValueError):
            raise ValidationError("Persona inválida.")
        with connection.cursor() as c:
            ops.ready(c)
            return Response(adjustments.get_draft(c, request, pid))


class Presencial(Create):
    roles = ops.STAFF
    form = forms.Presencial
    operation = staticmethod(adjustments.walk_in)
