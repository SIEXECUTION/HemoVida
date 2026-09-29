from django.apps import AppConfig

class SeguridadConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.seguridad'
    verbose_name = 'Seguridad, Actores y Auditoría'

    def ready(self):
        import sys
        if any(arg in sys.argv for arg in ['test', 'makemigrations', 'migrate', 'collectstatic']):
            return
        try:
            from .utils import sincronizar_secuencias_seguridad
            sincronizar_secuencias_seguridad()
        except Exception:
            pass

