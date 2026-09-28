"""
Custom Test Runner que habilita managed=True temporalmente durante las pruebas
para que Django cree las tablas en la base de datos de pruebas en memoria.
"""
from django.test.runner import DiscoverRunner

class UnmanagedModelTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        from apps.seguridad.models import Persona, Rol, PersonalSalud, Usuario, BitacoraAuditoria
        from apps.donantes.models import Donante, ExtraccionDonacion
        from apps.inventario.models import GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa

        unmanaged_models = [
            Persona, Rol, PersonalSalud, Usuario, BitacoraAuditoria,
            Donante, ExtraccionDonacion,
            GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa
        ]

        for model in unmanaged_models:
            model._meta.managed = True

        return super().setup_databases(**kwargs)
