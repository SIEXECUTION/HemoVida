from django.urls import path
from .views import Catalogo, Consulta
from .static_views import CatalogoEstatico, InformeEstatico
from .chatbot import ChatbotReporteView, ChatbotExportacionView

urlpatterns = [
    path('estaticos/catalogo/', CatalogoEstatico.as_view()),
    path('estaticos/informe/', InformeEstatico.as_view()),
    path("catalogo/", Catalogo.as_view()),
    path("consulta/", Consulta.as_view()),
    path("chatbot/", ChatbotReporteView.as_view(), name="reportes-chatbot"),
    path("chatbot/exportar/", ChatbotExportacionView.as_view(), name="reportes-chatbot-exportar"),
]
