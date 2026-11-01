from django.urls import path
from . import views

urlpatterns = [
    path('catalogo/', views.Catalogo.as_view()),
    path('turnos/', views.Turnos.as_view()),
    path('citas/', views.Citas.as_view()),
    path('citas/<int:ident>/reprogramar/', views.Reprogramar.as_view()),
    path('citas/<int:ident>/cancelar/', views.Cancelar.as_view()),
    path('incentivos/', views.Incentivos.as_view()),
    path('incentivos/<int:ident>/confirmar-refrigerio/', views.ConfirmarRefrigerio.as_view()),
]
