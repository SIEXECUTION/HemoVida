"""Fuentes autorizadas por perfil activo; finanzas permanece en ADMIN."""

from .services import CATALOG

SOURCES_BY_ROLE = {
    "ADMIN": tuple(CATALOG),
    "DOC_TRIAJE": ("extracciones", "triajes", "citas"),
    "BIOQ_INTEGRAL": (
        "extracciones",
        "triajes",
        "citas",
        "serologia",
        "laboratorio_unidades",
        "demanda",
        "stock",
        "bajas",
    ),
    "TEC_LOGISTICA": ("stock", "bajas", "demanda"),
}
