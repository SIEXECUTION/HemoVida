from django.db import connection, DatabaseError
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.laboratorio.views import ConflictoLaboratorio
from . import services as ops, serializers as forms


class ClinicalRole(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        role = request.auth.get("rolActivo") if request.auth else None
        return bool(
            u
            and u.is_authenticated
            and u.estado == "Activo"
            and role in view.roles
            and u.roles.filter(codigoRol=role).exists()
        )


class Operations(APIView):
    permission_classes = [ClinicalRole]
    roles = ["ADMIN", "DOC_TRIAJE", "BIOQ_INTEGRAL", "PERS_COLECTA", "TEC_LOGISTICA"]

    def get(self, request):
        if connection.vendor != "postgresql":
            raise ValidationError("Se requiere PostgreSQL.")
        with connection.cursor() as c:
            from hemovida_project.schema_checks import missing_cycle3

            extended = not missing_cycle3(c)
            extra = (
                {
                    "protocolos": ops.rows(
                        c, "SELECT * FROM protocoloconservacion ORDER BY tipocomponente"
                    ),
                    "incidencias": ops.rows(
                        c,
                        "SELECT * FROM incidenciacolecta ORDER BY idincidencia DESC LIMIT 100",
                    ),
                    "autologas": ops.rows(
                        c,
                        "SELECT * FROM colectaautologa ORDER BY idunidadmadre DESC LIMIT 100",
                    ),
                }
                if extended
                else {"protocolos": [], "incidencias": [], "autologas": []}
            )
            c.execute("SELECT to_regclass('public.programacionautologa')")
            extra['programas'] = ops.rows(c, "SELECT idprograma,idreceptor,fechacirugia FROM programacionautologa WHERE estado='Aprobada' AND fechacirugia>(now() AT TIME ZONE 'America/La_Paz')::date ORDER BY idprograma") if c.fetchone()[0] else []
            return Response(
                {
                    **extra,
                    "revision07": extended,
                    "personas": ops.rows(
                        c,
                        "SELECT p.idpersona,p.ci,p.nombres,p.apellidos FROM persona p JOIN posibledonador d USING(idpersona) WHERE p.ci ILIKE %s OR p.nombres ILIKE %s OR p.apellidos ILIKE %s ORDER BY p.idpersona DESC LIMIT 100",
                        ["%" + request.query_params.get("q", "")[:80] + "%"] * 3,
                    ),
                    "citas": ops.rows(
                        c,
                        "SELECT * FROM citadonacion WHERE estadocita IN ('Programada','Atendida') ORDER BY fechahoraprogramada DESC LIMIT 100",
                    ),
                    "triajes": ops.rows(
                        c,
                        "SELECT * FROM triajeclinico ORDER BY fechahora DESC,idtriaje DESC LIMIT 100",
                    ),
                    "diferimientos": ops.rows(
                        c,
                        "SELECT * FROM diferimiento ORDER BY iddiferimiento DESC LIMIT 100",
                    ),
                    "madres": ops.rows(
                        c,
                        "SELECT * FROM unidadsangretotal ORDER BY idunidadmadre DESC LIMIT 100",
                    ),
                    "componentes": ops.rows(
                        c,
                        "SELECT * FROM ejemplarbolsa ORDER BY idejemplarbolsa DESC LIMIT 200",
                    ),
                    "ubicaciones": ops.rows(
                        c, "SELECT * FROM ubicacionalmacen ORDER BY idubicacion"
                    ),
                    "grupos": ops.rows(
                        c, "SELECT * FROM gruposanguineo ORDER BY idgrupo"
                    ),
                }
            )


class Mutation(APIView):
    permission_classes = [ClinicalRole]

    def post(self, request, **kwargs):
        form = self.form(data=request.data)
        form.is_valid(raise_exception=True)
        try:
            result = self.operation(request, **kwargs, d=form.validated_data)
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc
        return Response(result, status=201)


class TriajeView(Mutation):
    roles = ["ADMIN", "DOC_TRIAJE"]
    form = forms.Triaje
    operation = staticmethod(ops.triage)


class DiferimientoView(Mutation):
    roles = ["ADMIN", "DOC_TRIAJE", "BIOQ_INTEGRAL"]
    form = forms.Diferimiento
    operation = staticmethod(ops.defer)


class ColectaView(Mutation):
    roles = ["ADMIN", "PERS_COLECTA"]
    form = forms.Colecta
    operation = staticmethod(ops.collect)


class FraccionamientoView(Mutation):
    roles = ["ADMIN", "BIOQ_INTEGRAL", "TEC_LOGISTICA"]
    form = forms.Fraccionamiento
    operation = staticmethod(ops.fraction)


class CustodiaView(Mutation):
    roles = ["ADMIN", "BIOQ_INTEGRAL", "TEC_LOGISTICA"]
    form = forms.Custodia
    operation = staticmethod(ops.custody)


class BajaView(Mutation):
    roles = ["ADMIN", "BIOQ_INTEGRAL", "TEC_LOGISTICA"]
    form = forms.Baja
    operation = staticmethod(
        lambda request, bolsa, d: ops.custody(request, bolsa, d, baja=True)
    )


class AdmisionView(Mutation):
    roles = ["ADMIN", "PERS_COLECTA"]
    form = forms.Admision
    operation = staticmethod(ops.admit)


class PerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.seguridad.utils import generate_tokens_for_usuario

        role = request.data.get("rolActivo")
        if (
            request.user.estado != "Activo"
            or not request.user.roles.filter(codigoRol=role).exists()
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Perfil no asignado a la cuenta.")
        return Response(generate_tokens_for_usuario(request.user, role))


class ProtocoloView(Mutation):
    roles = ["ADMIN"]
    form = forms.Protocolo
    operation = staticmethod(ops.protocol)


class IncidenciaView(Mutation):
    roles = ["ADMIN", "PERS_COLECTA"]
    form = forms.Incidencia
    operation = staticmethod(ops.incident)


class ComunicacionView(Mutation):
    roles = ["ADMIN", "DOC_TRIAJE", "BIOQ_INTEGRAL"]
    form = forms.Comunicacion
    operation = staticmethod(ops.communicate)


class BajaMadreView(Mutation):
    roles = ["ADMIN", "BIOQ_INTEGRAL", "TEC_LOGISTICA"]
    form = forms.Baja
    operation = staticmethod(ops.discard_mother)


class CondicionesView(Mutation):
    roles = ["ADMIN", "BIOQ_INTEGRAL", "TEC_LOGISTICA"]
    form = forms.Condiciones
    operation = staticmethod(ops.equipment_conditions)


class CustodiaAutologaView(Mutation):
    roles = ["ADMIN", "BIOQ_INTEGRAL", "TEC_LOGISTICA"]
    form = forms.Custodia
    operation = staticmethod(
        lambda request, bolsa, d: ops.custody(request, bolsa, d, autologa=True)
    )


class ReactivarAutologaView(Mutation):
    roles = ["ADMIN", "BIOQ_INTEGRAL"]
    form = forms.Reactivacion
    operation = staticmethod(ops.reactivate_autologous)
