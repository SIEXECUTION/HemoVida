@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" exit /b 1
".venv\Scripts\python.exe" backend\verificar_conexion.py
set "check_result=%errorlevel%"
pause
exit /b %check_result%
