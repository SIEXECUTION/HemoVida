# Documento completo de HemoVida

`completar_con_diagramas.py` integra 135 diagramas y 19 capturas en una copia de `output/documentos/HEMOVIDA_DOCUMENTO_CORREGIDO_HASTA_CICLO_3.docx`. Conserva la portada, el orden y la numeración de los capítulos, completa los apartados y escribe `output/documentos/HEMOVIDA_COMPLETO_CON_135_DIAGRAMAS.docx`.

## Entradas

- Word corregido indicado arriba; el original no se sobrescribe.
- `output/diagramas_hemovida/indice.json`, sus 135 PNG y SVG, regenerados mediante los scripts de `tools/diagramas`.
- `tools/diagramas/casos.json`.
- `output/capturas_frontend_2026-11-01/indice.json` y sus imágenes locales.
- `tools/documentos/volumen_bd_2026-11-01.json`: fotografía de cantidades y tamaños agregados de las tablas, sin registros personales. Es una referencia fechada, no una consulta en vivo.

Los diagramas y las capturas se conservan localmente y están excluidos de Git. Para regenerar desde otro equipo se necesitan esas entradas. El DOCX final contiene las imágenes incorporadas y puede abrirse sin ellas.

## Regeneración en este equipo

Cerrar el DOCX de salida antes de ejecutar. Desde la raíz del proyecto:

```powershell
& 'C:\Users\Sebas\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' tools/documentos/completar_con_diagramas.py
powershell -NoProfile -File tools/documentos/actualizar_indice.ps1 -ExportarRevision
```

El autor requiere `python-docx`, `lxml` y `Pillow`. La actualización del índice requiere Microsoft Word instalado en Windows. El segundo paso repagina, actualiza los campos y guarda el índice; opcionalmente exporta un PDF interno de revisión bajo `.venv/documento_cierre/`. Revisar visualmente las páginas después de regenerar.

Los SVG se incorporan con PNG alternativo para compatibilidad. Las vistas generales de datos se complementan con diagramas por módulo. Los manifiestos temporales se guardan bajo `.venv/documento_cierre/`. El script no aplica migraciones, modifica la base, envía correos ni realiza pagos.

El cierre conserva el repositorio `https://github.com/SIEXECUTION/HemoVida` y añade el enlace del frontend de producción `https://hemovida-banco-de-sangre.siexecution2026.workers.dev/`. `enlaces_documento.py` permite incorporar este cierre sobre el Word ya generado sin reconstruir las figuras.
