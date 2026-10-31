@echo off
setlocal
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo Ejecuta primero preparar_local.ps1
  exit /b 1
)
call npm run dev -- --host 127.0.0.1
pause
