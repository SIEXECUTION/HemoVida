@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Ejecuta primero preparar_local.ps1
  exit /b 1
)
".venv\Scripts\python.exe" backend\verificar_conexion.py
if errorlevel 1 (
  echo Completa o corrige backend\.env antes de iniciar.
  pause
  exit /b 1
)
cd backend
"..\.venv\Scripts\python.exe" manage.py runserver 127.0.0.1:8000
pause
