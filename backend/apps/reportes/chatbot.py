"""CU25 interpreta preguntas y ejecuta únicamente reportes del catálogo."""

import json
import re

from django.conf import settings
from django.core import signing
from django.db import DatabaseError, connection
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinica.services import revision07
from apps.clinica.views import ClinicalRole
from apps.laboratorio.views import ConflictoLaboratorio
from apps.seguridad.utils import registrar_auditoria
from .access import SOURCES_BY_ROLE
from .services import CATALOG, METRICS, query
from .views import Consulta


DESCRIPTIONS = {
    "stock": "Stock utilizable y vencimiento próximo, por grupo ABO/Rh, componente o categoría.",
    "triajes": "Conteo de triajes e indicadores de aptitud y diferimiento por período.",
    "extracciones": "Cantidad de donaciones y volumen recolectado por período.",
    "citas": "Citas de donación, asistencia e inasistencia por período.",
    "serologia": "Resultados agregados de serología por período y dictamen.",
    "laboratorio_unidades": "Bolsas madre por estado de liberación, incluida cuarentena.",
    "bajas": "Bajas de inventario por período, motivo u origen.",
    "demanda": "Solicitudes hospitalarias, unidades solicitadas y entregadas por estado o prioridad.",
    "cartera": "Saldo de deudas y obligaciones pendientes en bolivianos.",
    "recaudacion": "Pagos confirmados e importe recaudado en bolivianos por período.",
    "intentos": "Intentos de pago y su tasa de confirmación por período.",
}
STATES = {
    "triajes": ["Apto", "Rechazado"],
    "citas": ["Programada", "Atendida", "Cancelada", "Inasistencia", "Pendiente"],
    "serologia": ["Apto", "No Apto"],
    "laboratorio_unidades": ["En Cuarentena", "Liberada Apta", "Rechazada"],
    "demanda": ["Registrada", "En Evaluacion", "En Proceso", "Despachada", "Anulada"],
    "cartera": ["Pendiente", "Parcial", "Liquidada", "Vencida"],
}
LABELS = {
    "dimension": "Grupo",
    "cantidad": "Cantidad",
    "vencimiento_proximo": "Próximas a vencer",
    "volumen": "Volumen (ml)",
    "importe": "Importe (BOB)",
    "unidades_solicitadas": "Unidades solicitadas",
    "unidades_entregadas": "Unidades entregadas",
}
EXPORT_SALT = "hemovida.cu25.exportacion"
SQL_TEXT = re.compile(
    r"\b(?:select\s+.+?\s+from|(?:drop|alter|create|truncate)\s+(?:table|schema|database)"
    r"|insert\s+into|delete\s+from|update\s+\w+\s+set)\b",
    re.IGNORECASE | re.DOTALL,
)


class ChatMessage(serializers.Serializer):
    mensaje = serializers.CharField(max_length=600)
    historial = serializers.ListField(
        child=serializers.CharField(max_length=600), max_length=4, required=False,
    )


def fields_for(source):
    config = CATALOG[source]
    fields = {"dimension": serializers.ChoiceField(choices=tuple(config["dims"]), required=False)}
    if config["date"]:
        for name in ("desde", "hasta"):
            fields[name] = serializers.DateField(required=False)
    for name in config["filters"]:
        if name == "grupo":
            continue
        if name == "estado":
            fields[name] = serializers.ChoiceField(choices=STATES[source], required=False)
        elif name == "institucion":
            fields[name] = serializers.IntegerField(min_value=1, required=False)
        else:
            fields[name] = serializers.CharField(max_length=100, required=False)
    if source == "stock":
        fields.update(
            horizonte=serializers.IntegerField(min_value=0, max_value=365, required=False),
            grupo_abo=serializers.ChoiceField(choices=["O", "A", "B", "AB"], required=False),
            factor_rh=serializers.ChoiceField(choices=["+", "-"], required=False),
        )
    return fields


def declarations(allowed):
    tools = []
    for source in allowed:
        properties = {}
        for name, field in fields_for(source).items():
            schema = {"type": "STRING"}
            if isinstance(field, serializers.ChoiceField):
                schema["enum"] = list(field.choices)
            elif isinstance(field, serializers.IntegerField):
                schema["type"] = "INTEGER"
            elif isinstance(field, serializers.DateField):
                schema["description"] = "Fecha YYYY-MM-DD"
            properties[name] = schema
        tools.append({
            "name": source,
            "description": DESCRIPTIONS[source],
            "parameters": {"type": "OBJECT", "properties": properties},
        })
    denied = [source for source in DESCRIPTIONS if source not in allowed]
    if denied:
        tools.append({
            "name": "fuente_restringida",
            "description": "Usar cuando la pregunta solicita un reporte de una fuente sin permiso: "
                           + ", ".join(DESCRIPTIONS[source] for source in denied),
            "parameters": {"type": "OBJECT", "properties": {}},
        })
    return tools


def interpret(message, history, allowed):
    if not settings.GEMINI_API_KEY:
        raise AssistantUnavailable()
    from google import genai
    from google.genai import errors, types
    from httpx import HTTPError

    try:
        with genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=10000),
        ) as client:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=json.dumps({"consulta": message, "preguntas_previas": history}, ensure_ascii=False),
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "Interpreta solo solicitudes de reportes agregados de HemoVida. Elige una herramienta. "
                        "No inventes filtros ni agregues datos personales. Si faltan datos imprescindibles, "
                        "la pregunta es ajena al catálogo o pide SQL, no llames herramientas. "
                        "Para stock, grupo_abo y factor_rh deben venir juntos cuando se especifica ABO/Rh. "
                        "El reporte stock ya incluye cantidad disponible y vencimiento en una sola llamada. "
                        "Usa los nombres del sistema: Concentrado de Globulos Rojos, Plasma Fresco Congelado, "
                        "Concentrado Plaquetario, Crioprecipitado y Sangre Total. "
                        "El historial da contexto; la consulta actual tiene prioridad. "
                        f"La fecha institucional hoy es {timezone.localdate().isoformat()}."
                    ),
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                    tools=[types.Tool(function_declarations=declarations(allowed))],
                    temperature=0,
                ),
            )
    except (errors.APIError, HTTPError, TimeoutError) as exc:
        raise AssistantUnavailable() from exc
    calls = response.function_calls or []
    if not calls:
        return None
    source = calls[0].name
    filters = {}
    # Gemini puede emitir dos llamadas compatibles para métricas del mismo reporte.
    for call in calls:
        if call.name != source:
            return None
        for name, value in (call.args or {}).items():
            if name in filters and filters[name] != value:
                return None
            filters[name] = value
    return source, filters


class AssistantUnavailable(APIException):
    status_code = 503
    default_detail = "El asistente no está disponible. Puedes usar Consultas y KPIs (CU24)."


def authorized(source, role):
    if source == "fuente_restringida" or (source in CATALOG and source not in SOURCES_BY_ROLE[role]):
        raise PermissionDenied("El perfil activo no tiene permiso para consultar esa fuente.")
    if source not in CATALOG:
        raise ValidationError("Consulta fuera del catálogo de reportes.")


def report_parameters(source, arguments):
    fields = fields_for(source)
    if not isinstance(arguments, dict) or set(arguments) - fields.keys():
        raise ValidationError("El asistente generó filtros incompatibles. Reformula la consulta.")
    form = type("ReportFilters", (serializers.Serializer,), fields)(data=arguments)
    form.is_valid(raise_exception=True)
    params = {name: str(value) for name, value in form.validated_data.items()}
    abo, rh = params.pop("grupo_abo", None), params.pop("factor_rh", None)
    if abo or rh:
        if not (abo and rh):
            raise ValidationError("Especifica el grupo ABO y el factor Rh juntos.")
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT idgrupo FROM public.gruposanguineo WHERE grupoabo=%s AND factorrh=%s",
                [abo, "Positivo" if rh == "+" else "Negativo"],
            )
            row = cursor.fetchone()
        if row is None:
            raise ValidationError("El grupo ABO/Rh solicitado no figura en el catálogo.")
        params["grupo"] = str(row[0])
    return {"fuente": source, **params}


def run_report(params):
    try:
        with connection.cursor() as cursor:
            revision07(cursor)
        return query(params)
    except DatabaseError as exc:
        raise ConflictoLaboratorio() from exc


def audit(request, action, source=""):
    registrar_auditoria(
        request.user, f"CONSULTA_CHATBOT {action} {source}".strip(), "reporte",
        ip_origen=request.META.get("REMOTE_ADDR"),
        rol_activo=request.auth["rolActivo"],
    )


class ChatbotReporteView(APIView):
    permission_classes = [ClinicalRole]
    roles = list(SOURCES_BY_ROLE)

    def post(self, request):
        form = ChatMessage(data=request.data)
        form.is_valid(raise_exception=True)
        message = form.validated_data["mensaje"]
        history = form.validated_data.get("historial", [])
        if any(SQL_TEXT.search(text) for text in [message, *history]):
            audit(request, "RECHAZADA")
            raise ValidationError("Escribe una pregunta sobre reportes en lenguaje natural.")
        role = request.auth["rolActivo"]
        intent = interpret(message, history, SOURCES_BY_ROLE[role])
        if not intent:
            audit(request, "SIN_REPORTE")
            return Response({"respuesta": "Reformula la pregunta e indica el indicador que quieres consultar.",
                             "columnas": [], "filas": [], "consulta_exportacion": None})
        source, args = intent
        try:
            authorized(source, role)
        except PermissionDenied:
            audit(request, "DENEGADA")
            raise
        result = run_report(report_parameters(source, args))
        audit(request, "EJECUTADA", source)
        params = result["filtros"].copy()
        if result["desde"]:
            params.update(desde=result["desde"].isoformat(), hasta=result["hasta"].isoformat())
        ticket = signing.dumps({"params": params, "role": role, "user": request.user.pk}, salt=EXPORT_SALT)
        count = len(result["filas"])
        return Response({
            "respuesta": f"{DESCRIPTIONS[source]} Grupos encontrados: {count}.",
            "columnas": [{"clave": k, "etiqueta": LABELS.get(k, k.replace("_", " ").capitalize())}
                         for k in ["dimension", *METRICS[source]]],
            "filas": result["filas"][:50],
            "totales": result["totales"],
            "total_filas": count,
            "consulta_exportacion": ticket,
        })


class ChatbotExportacionView(Consulta):
    case = "CU25"

    def get(self, request):
        format = request.query_params.get("formato")
        if format not in ("pdf", "csv"):
            raise ValidationError("Formato no permitido.")
        try:
            ticket = signing.loads(request.query_params.get("consulta", ""), salt=EXPORT_SALT, max_age=900)
        except signing.BadSignature:
            raise ValidationError("La consulta expiró. Vuelve a enviarla antes de exportar.") from None
        role = request.auth["rolActivo"]
        if ticket["role"] != role or ticket["user"] != request.user.pk:
            raise PermissionDenied("Esta consulta se generó con otro perfil o cuenta.")
        params = ticket["params"]
        authorized(params["fuente"], role)
        result = run_report(params)
        audit(request, f"EXPORTADA_{format.upper()}", result["fuente"])
        result.update(titulo=DESCRIPTIONS[result["fuente"]], etiquetas=LABELS)
        return self.export(result, format)
