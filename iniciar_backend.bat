@echo off
title Backend HemoVida - Django REST Framework
echo ========================================================
echo   INICIANDO BACKEND HEMOVIDA (DJANGO REST FRAMEWORK)
echo ========================================================
cd backend
if not exist .env (
    copy .env.example .env
    echo Archivo .env generado automaticamente desde .env.example
)
python manage.py runserver 8000
pause
