# Validación del documento integrado

Fecha de referencia: 1 de noviembre de 2026.

Documento: `output/documentos/HEMOVIDA_COMPLETO_CON_135_DIAGRAMAS.docx`.

## Resultado

- 195 páginas después de actualizar campos e índice en Microsoft Word.
- 135 diagramas distintos, numerados de Figura 1 a Figura 135, ubicados en sus apartados.
- 19 capturas reales del frontend: una por caso de uso de los ciclos 1, 2 y 3.
- 155 imágenes en línea contando la portada; 52 tablas.
- 135 imágenes SVG incorporadas con alternativa PNG.
- Orden y textos de los capítulos principales conservados respecto del Word corregido; índice actualizado hasta cinco niveles.
- Sin reservas de inserción de imágenes ni páginas sin contenido en la extracción del PDF de revisión.

Se conservaron el original de Downloads y el Word corregido de referencia. Se revisaron las páginas renderizadas y se corrigieron un encabezado repetido, la falta de título de CU01 en comunicaciones y un marcador antiguo de QR. Las vistas generales grandes se acompañan de detalles por módulo y conservan su SVG para ampliar en Word.

La organización toma como referencia el documento del Grupo 7 y mantiene el índice propio de HemoVida. Las pruebas, escenarios y evidencias se integran en Documentación de los anexos sin añadir un capítulo que altere la numeración principal. Las categorías y causas de Ishikawa se completan en texto y tabla; no se reutilizan imágenes antiguas con identificadores incompatibles.

## Alcance de las evidencias

El cierre distingue capturas de interfaz, operaciones persistidas, pruebas locales y aceptación del despliegue. Se documenta la validación local de Stripe test y su idempotencia; la aplicación del secreto del destino público de Render y la aceptación financiera remota permanecen pendientes según la última evidencia disponible. El ciclo 4 conserva su ubicación en el índice y se señala como evolución futura, fuera de la aceptación de esta entrega.

La población y los protocolos descritos son académicos. El volumen de tablas corresponde a una lectura agregada fechada, sin exportar registros personales. Los reportes se describen en CSV y PDF. No se modificó el backend, la base de datos ni el despliegue para generar este documento.

## Verificación reproducible

Herramientas de autoría y actualización: `tools/documentos/`. El Word se exportó con Microsoft Word y se rasterizó con el renderizador de documentos para revisar la maquetación. El PDF y las imágenes de revisión son archivos internos bajo `.venv/documento_cierre/` y no forman parte de la entrega.

SHA256 de la referencia corregida: `6b31b9329989b160bba258f73bfe5a5b2f2ac4e64b9d237d0690118f1ee59f2b`.

SHA256 del DOCX con enlaces actualizados: `55a0d2a8465002afc9a15c90aeefce62fc396760becad072831901a8dcb78c46`.

## Enlaces de cierre

Se comprobó que Prototipar interfaz de usuario contiene 19 capturas: 5 del ciclo 1, 6 del ciclo 2 y 8 del ciclo 3. Se conserva el enlace clicable al repositorio `https://github.com/SIEXECUTION/HemoVida` y se añade al final `https://hemovida-banco-de-sangre.siexecution2026.workers.dev/`, que respondió HTTP 200 en la comprobación pública. Este resultado confirma disponibilidad de la portada, no aceptación de operaciones autenticadas ni del webhook. Se retira la mención a un QR inexistente en la tabla de cierre. El índice previamente actualizado se conserva; se evita forzar otra actualización automática de campos al abrir el archivo.

Revisión posterior de los enlaces: comprobación estructural del DOCX y relaciones de hipervínculo correcta; encabezados, tablas e imágenes de la versión revisada conservados. La exportación nativa de Word posterior a este cambio se bloqueó y se canceló. La revisión visual de 195 páginas descrita arriba corresponde a la versión anterior a añadir el enlace de producción; la nueva exportación visual queda pendiente. No se modificaron las capturas ni los diagramas.
