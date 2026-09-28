FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias de sistema para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código del backend
COPY . /app/

# Generar archivos estáticos
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "hemovida_project.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
