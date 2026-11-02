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
echo Abre output\diagramas_hemovida\galeria.html para revisar las imagenes.
echo PNG para Word, SVG y fuentes PlantUML editables.
echo Categorias y referencias en output\diagramas_hemovida\LEEME.md
pause
