from django.urls import path
from . import views

urlpatterns = [
    path("programas/", views.Programas.as_view()),
    path("programas/crear/", views.CrearPrograma.as_view()),
    path("programas/<int:ident>/revision/", views.RevisarPrograma.as_view()),
    path("programas/<int:ident>/historial/", views.HistorialPrograma.as_view()),
    path("cierres/", views.Cierres.as_view()),
    path("requisitos/", views.Requisitos.as_view()),
    path("requisitos/<int:ident>/", views.Requisitos.as_view()),
    path("borrador/", views.Borrador.as_view()),
    path("presencial/", views.Presencial.as_view()),
    path("catalogo/", views.Catalogo.as_view()),
    path("turnos/", views.Turnos.as_view()),
    path("citas/", views.Citas.as_view()),
    path("citas/<int:ident>/reprogramar/", views.Reprogramar.as_view()),
    path("citas/<int:ident>/cancelar/", views.Cancelar.as_view()),
    path("incentivos/", views.Incentivos.as_view()),
    path(
        "incentivos/<int:ident>/confirmar-refrigerio/",
        views.ConfirmarRefrigerio.as_view(),
    ),
]
