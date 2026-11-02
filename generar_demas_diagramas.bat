@echo off
setlocal
cd /d "%~dp0"
python tools\diagramas\generar_diagramas.py --grupo adicionales --descargar-plantuml %*
if errorlevel 1 (
 echo No se completo la generacion. Revisa el mensaje anterior.
 pause
 exit /b 1
)
echo Abre output\diagramas_complementarios\galeria.html
echo 31 diagramas nuevos con PNG, SVG y PlantUML editable.
pause
