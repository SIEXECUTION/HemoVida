"""CU23: plantillas fijas, sin filtros, columnas o fórmulas elegidos por el cliente."""

from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from .views import Consulta
from .services import CATALOG, METRICS
from .access import SOURCES_BY_ROLE

TEMPLATES = {
    "donaciones_diarias": ("Donaciones y volumen por día", "extracciones", "dia"),
    "aptitud_diaria": ("Evaluaciones clínicas por día", "triajes", "dia"),
    "asistencia_diaria": ("Asistencia a citas por día", "citas", "dia"),
    "serologia_diaria": ("Tamizaje serológico por día", "serologia", "dia"),
    "inventario_actual": ("Inventario actual por componente", "stock", "componente"),
    "bajas_por_motivo": ("Bajas por motivo", "bajas", "motivo"),
    "ingresos_diarios": ("Ingresos confirmados BOB por día", "recaudacion", "dia"),
    "cartera_actual": ("Cartera actual por institución", "cartera", "institucion"),
}
LABELS = dict(
    cantidad="Cantidad",
    volumen="Volumen (ml)",
    aptos="Evaluaciones aptas",
    rechazados="Evaluaciones rechazadas",
    porcentaje_aptitud="Aptitud (%)",
    porcentaje_diferimiento="Tasa de diferimiento (%)",
    canceladas="Citas canceladas",
    pendientes="Solicitudes pendientes",
    programadas="Turnos confirmados",
    asistencias="Asistencias",
    porcentaje_asistencia="Asistencia (%)",
    reactivas="Bolsas reactivas",
    indeterminadas="Bolsas indeterminadas",
    concluidas="Tamizajes concluidos",
    porcentaje_reactividad="Reactividad (%)",
    vencimiento_proximo="Caducan en los próximos 7 días",
    madres="Bajas de madre",
    componentes="Bajas de componente",
    importe="Importe (BOB)",
    cartera_vencida="Saldo vencido (BOB)",
    deudas_sin_moneda_excluidas="Deudas sin moneda confirmada excluidas",
)


class CatalogoEstatico(Consulta):
    def get(self, request):
        allowed = SOURCES_BY_ROLE[request.auth["rolActivo"]]
        return Response(
            {
                key: dict(
                    titulo=title,
                    periodo=bool(CATALOG[source]["date"]),
                    columnas=["dimension", *METRICS[source]],
                )
                for key, (title, source, _) in TEMPLATES.items()
                if source in allowed
            }
        )


class InformeEstatico(Consulta):
    case = "CU23"

    def fixed_pdf(self, result):
        from .fixed_pdf import render

        return render(result)

    def parameters(self, request):
        if set(request.query_params) - {"plantilla", "desde", "hasta", "formato"}:
            raise ValidationError(
                "El informe tiene estructura fija: solo admite plantilla, período y formato."
            )
        if any(len(values) != 1 for _, values in request.query_params.lists()):
            raise ValidationError("No se permiten parámetros repetidos.")
        template = request.query_params.get("plantilla")
        if template not in TEMPLATES:
            raise ValidationError("Selecciona una plantilla disponible.")
        _, source, dimension = TEMPLATES[template]
        if source not in SOURCES_BY_ROLE[request.auth["rolActivo"]]:
            raise PermissionDenied(
                "El perfil activo no tiene permiso para esta plantilla."
            )
        return dict(
            fuente=source,
            dimension=dimension,
            **{
                k: v
                for k, v in request.query_params.items()
                if k in ("desde", "hasta", "formato")
            }
        )

    def decorate(self, result, request):
        template = request.query_params["plantilla"]
        columns = ["dimension", *METRICS[result["fuente"]]]
        result["filas"] = [
            {col: row.get(col) for col in columns} for row in result["filas"]
        ]
        dimension_label = {
            "dia": "Día",
            "componente": "Componente",
            "motivo": "Motivo",
            "institucion": "Institución",
        }[TEMPLATES[template][2]]
        relevant = {
            "triajes": "diferimiento",
            "citas": "canceladas",
            "stock": "stock",
            "serologia": "serologia",
            "recaudacion": "finanzas",
            "cartera": "finanzas",
        }
        criteria = dict(
            zona_horaria="Período y agrupaciones expresados en hora de Bolivia."
        )
        if result["fuente"] in relevant:
            key = relevant[result["fuente"]]
            criteria[key] = result["criterios"][key]
        result["criterios"] = criteria
        result["filtros"] = {"Informe": TEMPLATES[template][0]}
        return dict(
            result,
            plantilla=template,
            titulo=TEMPLATES[template][0],
            columnas=columns,
            etiquetas=dict(LABELS, dimension=dimension_label),
            caso="CU23",
        )
