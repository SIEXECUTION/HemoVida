"""Configuración de conexión sin alterar credenciales ni conectar al importar."""

from urllib.parse import urlsplit
import dj_database_url
from django.core.exceptions import ImproperlyConfigured


def database_from_url(url, transaction_pooler=False):
    message = "Configura DATABASE_URL con la URI PostgreSQL de Supabase y contraseña codificada en backend/.env."
    try:
        parts = urlsplit(url.strip())
        if (
            parts.scheme not in ("postgres", "postgresql")
            or not parts.hostname
            or not parts.username
            or not parts.password
            or not parts.path.strip("/")
        ):
            raise ValueError("URI incompleta")
        if transaction_pooler and parts.port != 6543:
            raise ValueError(
                "El pooler de transacciones configurado requiere puerto 6543"
            )
        config = dj_database_url.parse(
            url.strip(), conn_max_age=0, conn_health_checks=True, ssl_require=True
        )
    except (ValueError, TypeError, KeyError) as exc:
        # No incluir excepciones del parser: pueden contener la URI y credenciales.
        raise ImproperlyConfigured(message) from None
    config["DISABLE_SERVER_SIDE_CURSORS"] = True
    config.setdefault("OPTIONS", {}).update(sslmode="require", connect_timeout=10)
    return config
