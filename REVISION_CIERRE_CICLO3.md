# Revisión de las dos observaciones de cierre del ciclo 3

Actualización del 1 de noviembre: el usuario confirmó contexto universitario y parámetros académicos. Las observaciones técnicas se resolvieron con 10 y la configuración aplicada a Supabase; consultar el [informe de cierre](informes/INFORME_CIERRE_CICLOS_2_Y_3_2026-11-01.md). Este archivo conserva el diagnóstico histórico anterior.

Fecha de revisión: 31 de octubre de 2026. Rama `codex/ciclo3-desarrollo-local`.
El usuario eligió el documento del proyecto como referencia **provisional**; esto no equivale a un protocolo médico institucional aprobado.

## 1. Reglas clínicas y protocolo

Se contrastaron los contratos de CU10/CU11/CU15, el texto extraído de `HEMOVIDA_documento_actualizado_BD.docx`, el código y los metadatos actuales de Supabase. No se modificó el DOCX ni se aplicaron migraciones o datos de prueba a Supabase.

| Punto | Comportamiento comprobado | Resultado / pendiente |
|---|---|---|
| Peso | Apto se bloquea con peso menor a 50 kg; exactamente 50 pasa esta restricción. | El texto general y la entrevista dicen **más de 50**, mientras el procedimiento incluido usa `<50`. Hay contradicción documental. Se conserva la regla existente, ahora con prueba del límite; falta decidir la regla definitiva. |
| Hemoglobina / temperatura | Apto se bloquea por hemoglobina menor a 12,5 o temperatura mayor a 37,5. | Coincide con la regla parcial del SQL del proyecto. Los límites están probados, sin presentarlos como certificación clínica. |
| Presión arterial | Valores obligatorios, positivos, límites técnicos y diastólica menor que sistólica. | No hay una matriz institucional completa de presión/aptitud. Los límites del formulario no son umbrales clínicos aprobados. |
| Edad y antecedentes | El dictamen sigue siendo profesional. CU10 no comprueba por sí mismo mayoría de edad ni una entrevista clínica completa. | El documento menciona mayoría de edad. Revisar también CU07/CU08 para definir y probar la comprobación del servidor, antes de considerar completa la elegibilidad. |
| Diferimiento | Tipo Temporal/Definitivo explícito, motivo, fuente de la misma persona y cancelación de citas; temporal exige días positivos y definitivo fecha final nula. | Verificado. Un temporal de 500 días no se transforma en definitivo. Comunicación registra una actuación profesional; no es un envío automático de correo. |
| Descanso entre colectas | 90 días para sexo M y 120 para los demás valores del catálogo actual. | Son reglas provisionales del proyecto. Falta validar excepciones, sexo desconocido y tratamiento de colectas autólogas con la institución. |
| Vigencia y fraccionamiento | Último triaje apto del día; fraccionamiento dentro de 8 horas; volumen total no supera extracción y cada bolsa respeta capacidad. | Restricciones existentes probadas. Las fechas clínicas heredadas siguen usando el día de la conexión UTC; no confundir con CU24, que ya usa America/La_Paz. Requiere unificar la regla horaria clínica antes del cierre operativo. |
| Volumen de colecta | Serializer admite 300–9999 ml; las incidencias interrumpidas usan un circuito separado. | Es un contrato técnico heredado, **no un intervalo clínico aprobado**. El documento no aporta una tabla completa para fijar máximos por tipo de donación. No se inventó un máximo médico nuevo. |
| Conservación | Fraccionamiento exige protocolo por componente, temperatura dentro del rango y agitación si corresponde. Caducidad = fecha de extracción + días configurados. | Prueba local con 7 días sintéticos confirma que no usa los 35 días fijos del SP. Sin protocolo se rechaza; un fallo del segundo componente revierte también el primero. |
| Configuración remota | La consulta de solo lectura devolvió **cero filas** en `protocoloconservacion`. | Pendiente real de operación: registrar protocolos por componente desde Atención clínica con ADMIN y profesional vinculado, con valores aprobados. No se sembraron valores provisionales en Supabase. |

Se corrigió el mensaje de validación que llamaba «institucionales» a las restricciones parciales del código. Los valores y decisiones clínicas no cambiaron en esta revisión.

**Resultado:** revisión técnica realizada; conformidad clínica completa pendiente. La referencia provisional permite continuar desarrollo y pruebas aisladas, pero no resuelve las contradicciones ni sustituye las aprobaciones faltantes.

## 2. Procedimientos heredados y servicios actuales

La fuente de reglas del **circuito HTTP actual** de CU10/CU11/CU15 son los serializers y servicios de `backend/apps/clinica`, dentro de la transacción auditada. Las funciones y triggers de 06 continúan activos para liberación conjunta y auditoría. No se sustituyen por los SP clínicos antiguos.

| Procedimiento existente en Supabase | Desconexión comprobada | Uso por el circuito actual |
|---|---|---|
| `sp_procesar_triaje_clinico` | Infiere definitivo si días >365; no ofrece el mismo contrato explícito de tipo, referencias de laboratorio y comunicación del servicio. | No invocado. |
| `sp_registrar_flebotomia` | No recibe `idtriaje` ni persiste consentimiento. | No invocado: el servicio guarda extracción, triaje, consentimiento y madre de forma atómica. |
| `sp_registrar_fraccionamiento` | No consulta `protocoloconservacion`; conserva +35/+365/+5 días. | No invocado: el servicio consulta el protocolo para cada componente. |

Una prueba instrumenta las sentencias SQL del circuito real triaje → colecta → fraccionamiento → diferimiento y falla si aparece alguno de esos tres nombres. La revisión del código confirma que los `CALL` de seguridad/autoregistro son un circuito distinto: **no se eliminaron** ni se cambió su mecanismo de contraseñas.

Los tres SP heredados mantienen permiso EXECUTE para PUBLIC y para la conexión actual, y son SECURITY INVOKER. Esto no demuestra acceso anónimo a los datos: la ejecución también depende de los privilegios del invocador y la exposición del servicio. Sí confirma que siguen siendo una vía alternativa para clientes con permisos suficientes. La revisión no permite afirmar que ningún cliente externo los use.

**Decisión técnica para esta versión:** conservar los servicios actuales como entrada del circuito clínico de la aplicación y documentar los tres SP como heredados, sin conectarlos desde nuevas pantallas. No duplicar reglas ni volver a ejecutar el SQL maestro. Para retirarlos de la BD se debe inventariar consumidores y preparar una migración específica de permisos/retirada, con pruebas del rol real de Render y de los clientes afectados; esta revisión no ejecuta DROP/REVOKE ni altera Supabase.

**Resultado:** la separación en la aplicación quedó delimitada y probada. El saneamiento de las vías heredadas en la BD sigue pendiente; no se considera cerrada la exclusividad de reglas para otros clientes.

## Evidencia y reproducción

Diagnóstico repetible, sin pacientes, secretos ni escrituras:

```powershell
# Desde backend, usa DATABASE_URL de backend/.env:
..\.venv\Scripts\python.exe revisar_reglas_ciclo3.py
```

La transacción se establece como READ ONLY antes de consultar. Devuelve firmas, permisos, referencias detectadas en el código de los SP, protocolos configurados y nombres de restricciones históricas sin validar. La detección por texto sirve de diagnóstico; no sustituye la revisión de sus definiciones.

También se confirmaron `chk_ejemplar_volumen_cu04` y `chk_parametro_umbrales_logicos` sin validación de históricos. No se ejecutó VALIDATE CONSTRAINT ni se modificaron datos históricos.

Pruebas de escritura, únicamente contra PostgreSQL desechable `127.0.0.1:55439/hemo_liberacion_test`:

```powershell
..\.venv\Scripts\python.exe -m unittest tests_ciclo3_postgres.Cycle3Tests tests_liberacion_postgres.LiberacionPostgresTests -q
..\.venv\Scripts\python.exe manage.py check
```

Esta revisión no cambia el frontend, no aplica migraciones, no hace push y no despliega Render/Cloudflare. El ciclo 3 mantiene pendientes clínicos y operativos explícitos; se puede comenzar la revisión del ciclo 2 conservando este registro de observaciones.

Resultado de esta revisión: **52 pruebas PostgreSQL aprobadas** (incluidas cuatro nuevas verificaciones de límites provisionales, conservación dinámica, reversión atómica y separación de SP) y `manage.py check` sin errores.
