@echo off
setlocal
cd /d "%~dp0"
python tools\diagramas\generar_diagramas.py --descargar-plantuml %*
if errorlevel 1 (
 echo.
 echo No se completo la generacion. Revisa el mensaje anterior.
 pause
 exit /b 1
)
echo.
echo Diagramas guardados en output\diagramas_hemovida
pause
