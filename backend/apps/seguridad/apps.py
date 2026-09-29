from django.apps import AppConfig

class SeguridadConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.seguridad'
    verbose_name = 'Seguridad, Actores y Auditoría'

    def ready(self):
        try:
            from .db_initializer import initialize_database_if_needed
            initialize_database_if_needed()
        except Exception as e:
            print(f"[SeguridadConfig] Error al inicializar DB: {e}")
