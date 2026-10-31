from django.urls import path
from .views import *

urlpatterns = [
    path("componentes/<int:bolsa>/custodia-autologa/", CustodiaAutologaView.as_view()),
    path("madres/<int:madre>/reactivar-autologa/", ReactivarAutologaView.as_view()),
    path("ubicaciones/<int:ubicacion>/condiciones/", CondicionesView.as_view()),
    path("protocolos/", ProtocoloView.as_view()),
    path("incidencias/", IncidenciaView.as_view()),
    path("diferimientos/<int:diferimiento>/comunicar/", ComunicacionView.as_view()),
    path("madres/<int:madre>/baja/", BajaMadreView.as_view()),
    path("admision/", AdmisionView.as_view()),
    path("perfil/", PerfilView.as_view()),
    path("operaciones/", Operations.as_view()),
    path("triajes/", TriajeView.as_view()),
    path("diferimientos/", DiferimientoView.as_view()),
    path("colectas/", ColectaView.as_view()),
    path("madres/<int:madre>/fraccionar/", FraccionamientoView.as_view()),
    path("componentes/<int:bolsa>/custodiar/", CustodiaView.as_view()),
    path("componentes/<int:bolsa>/baja/", BajaView.as_view()),
]
