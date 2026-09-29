"""
Django settings for hemovida_project.
Configurado para el Sistema de Banco de Sangre "HemoVida"
Integración con PostgreSQL (Local y Supabase Cloud), JWT, CORS, Koyeb y Vercel.
"""

from pathlib import Path
import os
import socket
from datetime import timedelta
from dotenv import load_dotenv
import dj_database_url

# Forzar resolución IPv4 en entornos Linux / Docker / Render sin enrutamiento IPv6.
# Evita el error "[Errno 101] Network is unreachable" de Python al conectar a smtp.gmail.com
_original_getaddrinfo = socket.getaddrinfo
def _ipv4_first_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    try:
        return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    except Exception:
        return _original_getaddrinfo(host, port, family, type, proto, flags)

socket.getaddrinfo = _ipv4_first_getaddrinfo

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables de entorno desde el archivo .env
load_dotenv(BASE_DIR / '.env')

# Clave secreta
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-hemovida-bloodbank-secret-key-2025-secure-token-xyz789')

# Modo depuración
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

# Hosts permitidos (Permite configurar dominios o comodín '*')
allowed_hosts_env = os.getenv('ALLOWED_HOSTS')
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(',') if h.strip()] if allowed_hosts_env else ['*']

# Aplicaciones instaladas
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Librerías de terceros
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',

    # Aplicaciones del dominio HemoVida
    'apps.seguridad',
    'apps.donantes',
    'apps.inventario',
]

# Middlewares
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Debe estar arriba de todo
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Soporte para servir archivos estáticos en Koyeb
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hemovida_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hemovida_project.wsgi.application'

# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS (Soporta Supabase, PostgreSQL local y SQLite)
# ============================================================================
import sys
USE_SQLITE = os.getenv('USE_SQLITE', 'False').lower() in ('true', '1')
DATABASE_URL = os.getenv('DATABASE_URL')

if 'test' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
elif USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif DATABASE_URL:
    import re
    import urllib.parse
    
    # Sanitización exhaustiva de DATABASE_URL (remueve comillas, corchetes y urlencodea contraseñas con caracteres especiales)
    raw_url = DATABASE_URL.strip().strip('"\'')
    raw_url = raw_url.replace('[', '').replace(']', '')
    
    # Expresión regular para separar y codificar credenciales
    m = re.match(r'^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^@\/:]+)(?::(\d+))?(\/.*)?$', raw_url)
    if m:
        scheme, user, password, host, port, rest = m.groups()
        encoded_pass = urllib.parse.quote(urllib.parse.unquote(password))
        port_str = f":{port}" if port else ""
        rest_str = rest if rest else ""
        clean_db_url = f"{scheme}{user}:{encoded_pass}@{host}{port_str}{rest_str}"
    else:
        clean_db_url = raw_url

    os.environ['DATABASE_URL'] = clean_db_url
    try:
        DATABASES = {
            'default': dj_database_url.parse(
                clean_db_url,
                conn_max_age=600,
                conn_health_checks=True,
                ssl_require=True
            )
        }

    except Exception as e:
        print(f"[WARN] Error al configurar DATABASE_URL: {e}. Activando fallback a SQLite.")
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }



else:
    # Si estamos en Render o no hay DB_HOST externo configurado, usar SQLite para evitar error 500 por localhost
    if os.getenv('RENDER') or os.getenv('DB_HOST', 'localhost') == 'localhost':
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
    else:
        # Conexión estándar por parámetros individuales (PostgreSQL Remoto)
        DB_ENGINE = os.getenv('DB_ENGINE', 'django.db.backends.postgresql')
        DB_NAME = os.getenv('DB_NAME', 'Hemovida')
        DB_USER = os.getenv('DB_USER', 'postgres')
        DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
        DB_HOST = os.getenv('DB_HOST')
        DB_PORT = os.getenv('DB_PORT', '5432')

        DATABASES = {
            'default': {
                'ENGINE': DB_ENGINE,
                'NAME': DB_NAME,
                'USER': DB_USER,
                'PASSWORD': DB_PASSWORD,
                'HOST': DB_HOST,
                'PORT': DB_PORT,
            }
        }

# Validación de Contraseñas (incluye el validador estricto con la política del trigger SQL)
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'apps.seguridad.validators.SecurePasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Configuración de Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.seguridad.authentication.CustomJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Configuración de Simple JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# Configuración de CORS para Frontend React y Vercel
CORS_ALLOW_ALL_ORIGINS = True  # Permite que el frontend en Vercel se comunique sin bloqueos
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?://.*\.pages\.dev$",
    r"^https?://.*\.vercel\.app$",
    r"^https?://.*\.koyeb\.app$",
    r"^http://localhost:(3000|5173)$",
    r"^http://127\.0\.0\.1:(3000|5173)$",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Internacionalización y Zona Horaria
LANGUAGE_CODE = 'es-bo'
TIME_ZONE = 'America/La_Paz'
USE_I18N = True
USE_TZ = True

# Archivos estáticos y WhiteNoise para Koyeb
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Runner para pruebas con modelos managed=False
TEST_RUNNER = 'apps.test_runner.UnmanagedModelTestRunner'

# ============================================================================
# CONFIGURACIÓN DE ENVÍO DE CORREOS ELECTRÓNICOS (SMTP)
# ============================================================================
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
if EMAIL_PORT == 465:
    EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'True').lower() in ('true', '1', 'yes')
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'False').lower() in ('true', '1', 'yes')
else:
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
    EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 'yes')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', f"Banco de Sangre HemoVida <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "Banco de Sangre HemoVida <seguridad@hemovida.org>")
EMAIL_TIMEOUT = 10
