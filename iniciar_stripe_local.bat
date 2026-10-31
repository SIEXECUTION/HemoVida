@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Ejecuta preparar_local.ps1 antes de iniciar Stripe local.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -u "backend\escuchar_stripe.py"
if errorlevel 1 pause
