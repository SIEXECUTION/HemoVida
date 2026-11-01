# HemoVida: informe de cierre técnico de los ciclos 2 y 3

**Fecha:** 1 de noviembre de 2026. **Ámbito:** proyecto académico universitario.
**Rama:** `codex/ciclo3-desarrollo-local`. **Entorno validado:** backend/frontend locales y configuración real de Supabase por SSL/pooler 6543.

## 1. Resultado ejecutivo

Se completaron los pendientes técnicos identificados para los ciclos 2 y 3 en el alcance académico acordado. La migración 09 ya estaba aplicada en Supabase; se comprobó su estructura y se aplicó la migración 10 con respaldo previo. Se configuró conservación con los parámetros autorizados por el usuario, se unificó el calendario clínico en Bolivia, se restringieron los tres procedimientos clínicos heredados y se ajustaron los permisos de Logística/Bioquímica.

El código de esta entrega está implementado y probado localmente. Supabase ya tiene la configuración y los objetos de 10. **Esta entrega no publica el código nuevo en Render/Cloudflare ni configura un webhook público de Stripe.** Ese paso de publicación sigue separado del cierre técnico académico.

## 2. Cierre del ciclo 2

| Caso | Resultado comprobado |
|---|---|
| CU06 | Registro atómico compatible con las contraseñas existentes; catálogo de requisitos, respuestas versionadas y borradores incompletos persistidos. |
| CU07 | Agenda lunes a viernes, 08:00-12:00 y 13:00-17:00, intervalos de 15 minutos y 32 cupos diarios; cierres, reaperturas, búsqueda, paginación y control de concurrencia. |
| CU08 | Admisión del día y admisión presencial autorizada con cupo; reversión de cita/prefiltro si falla la admisión. No se exige un triaje previo para pasar a evaluación. |
| CU09 | Entrega única por extracción y confirmación posterior del refrigerio efectivamente registrado. |
| CU21 | Indicación médica, aprobación BIOQ, programación autóloga, citas/colectas vinculadas, historial y revisión de cambios/cancelación/cierre sin perder exclusividad. |
| CU23 | Ocho plantillas fijas con permisos por área, consulta, CSV y PDF; inventario/cartera actuales sin inventar stock histórico. |

En Supabase se comprobaron las columnas requeridas, claves foráneas e índices de 08/09, auditoría activa y RLS habilitada en las seis tablas nuevas correspondientes. No se detectaron elementos faltantes en ese contrato. Existen perfiles activos para administración, medicina, bioquímica, colecta y logística, con profesionales vinculados en los roles operativos.

La verificación remota utilizó metadatos y conteos. No se simularon sesiones de las personas reales ni se registraron citas, firmas, colectas, entregas o pagos de prueba en Supabase. Las pruebas funcionales completas se ejecutaron en PostgreSQL local aislado.

## 3. Cierre del ciclo 3

| Caso | Resultado comprobado |
|---|---|
| CU10 | Identidad, triaje, edad mínima y dictamen profesional. Peso estrictamente mayor a 50 kg, en concordancia con el texto del proyecto. |
| CU11 | Diferimiento temporal/definitivo explícito, origen de la misma persona, agenda restringida y registro de comunicación. La fecha final se interpreta por día local. |
| CU13/CU14 | Liberación conjunta y correcciones ABO/Rh auditadas. La liberación biológica y las correcciones requieren perfil activo BIOQ_INTEGRAL; ADMIN no lo sustituye. |
| CU15 | Consentimiento/colecta, modelo de bolsa 300-450 ml, incidencias, fraccionamiento dentro de 8 horas, conservación, capacidad, custodia, baja y exclusividad autóloga. Se rechaza fraccionar antes de la fecha de extracción. |
| CU22 | Se conserva finanzas BOB y Stripe test, idempotencia y webhook firmado; regresiones aprobadas. La entrega anterior ya probó Checkout/CLI contra Stripe sandbox. No se hicieron cobros nuevos en esta entrega. |
| CU24 | Consultas dinámicas y exportaciones con permisos, tasas/denominadores y fechas de Bolivia. El stock útil también exige liberación conjunta vigente. |

Los criterios de peso/edad/volumen y conservación se documentan como reglas del modelo académico. El contexto universitario confirmado por el usuario sustituye la observación anterior de una resolución institucional formal pendiente; no se presenta el proyecto como una implementación clínica real.

## 4. Conservación configurada en Supabase

| Componente | Temperatura | Conservación | Agitación |
|---|---|---:|---|
| Concentrado de Glóbulos Rojos | 2 a 6 °C | 35 días | No |
| Paquete Globular | 2 a 6 °C | 35 días | No |
| Sangre Total | 2 a 6 °C | 35 días | No |
| Concentrado Plaquetario | 20 a 24 °C | 5 días | Sí |
| Plasma Fresco Congelado | -30 a -18 °C | 365 días | No |
| Crioprecipitado | -30 a -18 °C | 365 días | No |

Se eligieron **35 días** dentro del rango 35-40 autorizado. Los puntos de referencia indicados por el usuario son 4 °C para glóbulos/sangre total y 22 °C para plaquetas; el sistema valida el rango completo configurado.

Logística mantiene la conservación y las condiciones de los equipos; BIOQ supervisa la liberación biológica. Para la carga inicial se asignó como responsable parametrizado una cuenta activa existente de TEC_LOGISTICA, profesional `idpersona=2`, priorizando una cuenta sin ADMIN. La carga se auditó como **Configuracion academica**, con actor de sistema y referencia a la autorización del usuario; no se fabricó una sesión ni firma de ese profesional.

Cada protocolo tiene `contexto=Academico` y referencia de origen. Repetir 10 inserta únicamente parámetros ausentes: no sobrescribe ajustes posteriores. Sangre Total se conserva como referencia de configuración; no se añadió un nuevo componente derivado al circuito de fraccionamiento.

No se cambiaron temperaturas, agitación o capacidades de equipos existentes para simular verificaciones físicas. El circuito exige seleccionar un equipo con condiciones compatibles antes de fraccionar o trasladar.

## 5. Fechas y procedimientos heredados

Se incorporaron `hemo_dia_clinico` y `hemo_fecha_clinica`, con `America/La_Paz`. Las columnas históricas sin zona se interpretan como UTC, conforme a las escrituras de Django y a la convención utilizada por CU24. No se reescribieron timestamps históricos.

Triaje, descanso entre donaciones, diferimientos, cancelación de citas, fecha de extracción/caducidad, reservas y liberación usan ahora el mismo día del centro. La barrera de liberación de 06 conserva sus controles y utiliza ese calendario. El carnet también usa la fecha local, independientemente de la zona horaria del servidor. Se probaron ambos lados de la medianoche UTC y local.

Se restringieron:

- `sp_procesar_triaje_clinico`.
- `sp_registrar_flebotomia`.
- `sp_registrar_fraccionamiento`.

La verificación posterior devolvió ejecución denegada para PUBLIC y para `anon`, `authenticated` y `service_role` en los tres procedimientos. No se borraron sus definiciones: el propietario mantiene acceso administrativo y los SP están marcados como heredados. No se detectaron llamadores almacenados por la inspección de código disponible, y las pruebas confirman que el backend actual no los invoca. Esto no pretende certificar todos los posibles clientes externos del propietario.

Los SP de autorregistro, personal y contraseñas no se modificaron. El flujo operativo autorizado de CU10/CU11/CU15 sigue siendo la API transaccional.

## 6. Preservación de datos y observaciones del histórico

Antes y después de aplicar 10 se comprobaron iguales conteos en 14 tablas operativas. Se conservaron **35 personas, 23 usuarios, 5 citas, 4 extracciones, 4 bolsas madre y 9 componentes**. Se añadieron los seis parámetros de conservación y sus eventos de configuración.

El histórico contiene **0 consentimientos y 0 análisis inmunohematológicos**, además de no tener todavía programas autólogos ni movimientos financieros. Esos datos no se completaron con firmas, dictámenes o pagos inventados. Un estado antiguo “Disponible” no garantiza por sí mismo que exista la evidencia actual: inventario, CU23 y CU24 excluyen del stock útil las unidades sin liberación conjunta vigente, sin alterar su registro histórico.

Para una demostración académica integral se debe recorrer el flujo nuevo con registros de ensayo identificados, o revisar por separado la población SQL preparada previamente. No se aplicaron los scripts de población ni de desactivación de cuentas.

## 7. Pruebas y evidencias

| Verificación | Resultado |
|---|---|
| PostgreSQL local aislado | **94 pruebas aprobadas**: ciclos 2/3 y 11 casos de cierre académico |
| Seguridad, donantes, inventario y CORS | **31 pruebas aprobadas** |
| Navegador | **14 pruebas aprobadas**, incluidos permisos BIOQ y configuración de Logística |
| Compilación | TypeScript y Vite aprobados |
| Backend | Django check sin errores |
| Supabase | Columnas/FK/índices, RLS, auditoría, permisos heredados, calendario y seis parámetros verificados |

Los casos nuevos comprueban calendario en cambio de día, vigencia de triaje, fechas de fraccionamiento, extracción futura, caducidad y liberación, fin local del diferimiento, límites académicos, permiso de Logística, rechazo de SP por un rol no administrativo, idempotencia de parámetros y exclusión de stock histórico sin validación conjunta. El caso de inventario también verifica que una unidad correctamente aprobada vuelva a contarse.

La prueba de navegador que inicialmente falló por cierre de Edge pasó al repetirla sin la carga concurrente; la ejecución final completa terminó con 14/14 aprobadas.

## 8. Migración, respaldo y reproducción

Aplicada en Supabase: `database/10_cierre_academico_y_calendario.sql`.
La ejecución exige prerrequisitos 06-09, usa transacción y tiempos máximos de bloqueo/ejecución, y genera primero un respaldo privado.

Respaldo utilizado, fuera de Git: `.venv/cierres/20261101T044146Z/`.

- `schema_antes.sql`: esquema público previo, sin datos de pacientes/usuarios.
- `revertir_permisos_y_barrera.sql`: permisos/comentarios previos y definición anterior de la barrera; su uso exige revisar también la versión del código.
- `diagnostico_antes.json` y `diagnostico_despues.json`: evidencia de la intervención y conteos.

El primer intento se detuvo al construir el respaldo de permisos, antes de ejecutar la migración. Se corrigió el escape SQL del generador y el segundo intento concluyó correctamente; no hubo una aplicación parcial de 10.

Diagnóstico remoto de solo lectura, desde `backend`:

```powershell
..\.venv\Scripts\python.exe cerrar_ciclos_academicos.py
```

Pruebas de escritura, exclusivamente en la base local desechable:

```powershell
..\.venv\Scripts\python.exe -m unittest tests_cierre_academico_postgres.AcademicClosureTests tests_ciclo2_completion_postgres.Cycle2CompletionTests tests_agenda_postgres.AgendaTests tests_ciclo3_postgres.Cycle3Tests tests_liberacion_postgres.LiberacionPostgresTests -q
..\.venv\Scripts\python.exe manage.py test apps.seguridad apps.donantes apps.inventario tests_cors --noinput
```

Desde `frontend`: `npm run build` y `npm run test:browser`, con Vite en 3000.

## 9. Estado final y siguiente hito

**Ciclos 2 y 3: cierre técnico del alcance académico completado en la versión local, con Supabase configurado y verificado.** Se conserva la rama secundaria; no se fusionó main ni se publicaron cambios en servicios externos.

Para usar esta versión públicamente queda publicar el código en Render/Cloudflare, revisar las variables de esos servicios y verificar los flujos desplegados, incluido el endpoint público de Stripe en modo test. Tampoco se certifica una aceptación manual por usuarios reales: se verificaron sus perfiles y la configuración remota, mientras los ensayos operativos usaron fixtures locales aislados.

No quedan pendientes de “resolución institucional clínica” para esta entrega universitaria: el usuario confirmó el contexto y los parámetros académicos utilizados. Las funciones de ciclos posteriores y un eventual uso clínico real quedan fuera de este cierre.
