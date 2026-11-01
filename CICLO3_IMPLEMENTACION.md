# Ciclo 3: implementación y validación local

Estado al 31 de octubre de 2026. Rama: `codex/ciclo3-desarrollo-local`.
Este documento actualiza el estado de los informes anteriores. El código y las pruebas son locales; no se publicó este cambio en Render ni Cloudflare.

La revisión de las dos observaciones de cierre está en [REVISION_CIERRE_CICLO3.md](REVISION_CIERRE_CICLO3.md): reglas clínicas provisionales, configuración de conservación aún vacía en Supabase y separación comprobada entre servicios actuales y SP heredados. No equivale al cierre clínico/operativo del ciclo.

## Base de datos

Se verificó la conexión real a Supabase por `DATABASE_URL`, SSL y pooler de transacciones en puerto 6543. Se comprobaron las tablas y columnas de 07, la función de liberación de 06 y los triggers de auditoría nuevos. El diagnóstico realiza únicamente consultas y devuelve error si detecta una migración incompleta.

El usuario aplicó 06 y 07 en Supabase. En esta continuación no se ejecutaron migraciones, SQL maestro ni escrituras de prueba sobre Supabase. `database/07_ciclo3_trazabilidad.sql` conserva la extensión aditiva usada por esta implementación. No volver a ejecutar el SQL financiero antiguo ni alterar contraseñas para instalar el módulo.

## Funciones conectadas

| Caso | Persistencia y comportamiento |
|---|---|
| CU10 | Admisión e identidad, biometría, dictamen profesional y observaciones opcionales del triaje. Se conserva la validación clínica previa, identidad y rol del profesional. |
| CU11 | Diferimiento temporal o definitivo explícito desde triaje o un análisis de laboratorio de la misma persona; restricciones y cancelación de citas; registro del canal, responsable y momento de la comunicación efectivamente realizada. |
| CU15 | Consentimiento y extracción trazables; incidente de colecta interrumpida; fraccionamiento con volumen, capacidad y conservación aprobada; verificación de temperatura/agitación; baja de madre y componentes con reservas canceladas; colecta autóloga para el mismo paciente y cirugía futura, reserva exclusiva y traslado de custodia específico. |
| CU13/CU14 | Se conserva liberación conjunta y bitácora de 06. Las unidades autólogas quedan reservadas al paciente. Una corrección que invalida resultados devuelve el lote a cuarentena; una reserva autóloga cancelada requiere revisión profesional antes de reactivarse y nueva liberación. |
| CU22 | Obligaciones BOB, autorización de pago posterior, abonos manuales con referencia única, pagos parciales, saldos derivados por el trigger financiero existente y comprobante al liquidar. Exoneración SUS y convenio se registran como tratamiento administrativo sin inventar ingreso. Checkout, notificaciones firmadas y conciliación contra Stripe. |
| CU24 | Consultas de extracciones, aptitud, citas, serología, stock, bajas, recaudación, cartera e intentos de pago. Filtros y agrupaciones del catálogo, gráficos, totales, CSV y PDF con criterios de consulta. |

Las pantallas de administración incluyen Finanzas y Consultas y KPIs. Se mantiene el tema visual HEMOVIDAX y los módulos útiles conectados a la API. Los formularios muestran éxito después de la respuesta del backend; los fallos conservan los datos para corregirlos. No se importan registros clínicos de localStorage.

Finanzas y aprobación de protocolos requieren ADMIN. CU24 utiliza la matriz de reportes aprobada: ADMIN accede a todas las fuentes; DOC_TRIAJE a extracciones, triajes y citas; BIOQ_INTEGRAL añade serología, stock y bajas; TEC_LOGISTICA accede a stock y bajas. Las consultas y exportaciones verifican el perfil activo y la asignación real del rol en el servidor. Esta matriz de CU24 no modifica los permisos de los otros módulos. Los roles clínicos mantienen sus permisos específicos, verificados contra el rol activo del JWT y los roles realmente asignados. No se cambió el mecanismo de contraseñas ni el envío de Brevo.

## Conservación y comunicación

Los protocolos de conservación deben ser aprobados por el responsable institucional desde Atención clínica. No se insertan valores clínicos ficticios como configuración de producción. El backend exige protocolo existente, temperatura válida y agitación cuando corresponda antes de fraccionar o trasladar. La caducidad deriva del protocolo aprobado.

Confirmar comunicación CU11 registra una comunicación efectuada por un profesional; no envía automáticamente un correo clínico. Las reglas previas de peso, hemoglobina, temperatura, descanso biológico y vigencia del triaje continúan siendo restricciones del proyecto; esta entrega no certifica un protocolo médico integral ni el circuito de retiro de componentes ya despachados.

## Finanzas y Stripe

Importes de nuevas obligaciones: BOB. Las obligaciones históricas sin moneda permanecen excluidas de los indicadores monetarios y bloqueadas para cobro hasta que un administrador confirme su moneda original. Confirmar BOB no convierte cantidades.

Stripe Checkout se crea en el backend con importe en centavos BOB, pago con tarjeta y clave de idempotencia persistida. No se necesita clave pública Stripe en el frontend, que abre el enlace HTTPS del Checkout alojado. El regreso del navegador no confirma pagos. El webhook comprueba firma, modo, sesión consultada a Stripe, moneda, importe y referencia antes de registrar el abono.

Una repetición del evento no duplica el ingreso. Un evento antiguo no revierte un pago confirmado. La conciliación consulta el estado real del proveedor y permite expirar sesiones todavía abiertas. Un error de red conserva el intento para reintentar con la misma clave; un rechazo definitivo de parámetros lo marca rechazado. Si un intento incierto sin sesión supera 23 horas se bloquea su recreación: requiere revisión en el panel Stripe antes de cobrar de nuevo, por la posible caducidad de la idempotencia del proveedor. Mientras existe un intento pendiente se bloquea otro abono sobre la misma deuda. Si los fondos recibidos exceden el saldo, se señala conciliación administrativa sin duplicar ni forzar el abono.

Stripe quedó validado también contra su sandbox externo, con las claves test guardadas por el usuario. Se completaron dos pagos simulados de 100 BOB desde el Checkout alojado, usando la tarjeta oficial de pruebas; no se movió dinero real. El primero se confirmó mediante conciliación y el segundo automáticamente mediante una notificación auténtica recibida por Stripe CLI. Ambos se registraron exclusivamente en PostgreSQL local, con un único comprobante por obligación. Repetir la conciliación y reenviar de forma firmada el mismo evento no duplicó abonos; CU24 mostró 200 BOB sin sumar los comprobantes.

La prueba externa detectó que Stripe API `2026-10-28.endive` rechaza `payment_method_types` al crear sesiones. Se corrigió a `allowed_payment_method_types=['card']`, que filtra los métodos elegibles del Dashboard sin permitir métodos incompatibles con el registro financiero. Se añadió la comprobación de ese contrato a la prueba de regresión.

El secreto guardado por el usuario coincide con el de Stripe CLI para el dispositivo local `hemovida-local`; no se reemplazaron las claves. La cuenta no tiene endpoints públicos de webhook test registrados. Para Render se debe registrar su URL después de desplegar el backend y usar el secreto de ese endpoint en Render. El secreto local de CLI no reemplaza al del endpoint público. La cuenta devolvió charges_enabled=False; esta validación en sandbox no certifica habilitación para cobrar dinero real.

En `backend/.env` para desarrollo, y en variables del servicio backend de Render para despliegue:

```dotenv
STRIPE_SECRET_KEY=          # sk_test_... de la cuenta
STRIPE_WEBHOOK_SECRET=      # whsec_... del endpoint o del CLI local
STRIPE_MODE=test
PAYMENT_FRONTEND_URL=http://127.0.0.1:3000
CORS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

En Render, `PAYMENT_FRONTEND_URL` debe ser el origen HTTPS de Cloudflare, sin `/api`; `CORS_ALLOWED_ORIGINS` debe incluir ese mismo origen. Se añadió esta configuración privada a `render.yaml`; no se cambiaron valores en el panel remoto. El backend ahora respeta la lista CORS en lugar de aceptar todos los sitios. Los encabezados Authorization están permitidos.

Endpoint externo a registrar en Stripe: `https://<backend-render>/api/finanzas/stripe/webhook/`. Eventos: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` y `checkout.session.async_payment_failed`. El secreto de un endpoint del panel es distinto del generado por `stripe listen`. Para probar localmente con Stripe CLI:

```text
stripe listen --forward-to http://127.0.0.1:8000/api/finanzas/stripe/webhook/
```

En esta máquina se instaló Stripe CLI 1.55.6 dentro de `.venv/stripe-cli`, fuera de Git. `iniciar_stripe_local.bat` inicia el receptor para el backend en puerto 8000, carga las claves desde backend/.env sin pasarlas por argumentos y oculta el secreto en la salida. Mantener esta tercera terminal abierta junto al backend y frontend. El lanzador comprueba que el secreto configurado coincida con el de CLI y admite únicamente test; no registra endpoints públicos ni activa cobros reales. En otra máquina se instala desde la raíz con `npm install --prefix .venv/stripe-cli @stripe/cli@1.55.6`.

Guardar el `whsec_...` correspondiente y reiniciar Django cuando se cambien variables. Crear una deuda de prueba mediante la aplicación, abrir su Checkout y pagar en modo test; verificar abono único y saldo tanto por webhook como conciliación, incluyendo reenvío del evento. Un evento genérico del CLI sin sesión creada por HemoVida será rechazado. Para producción se requieren claves de la misma cuenta en modo live y validación operativa previa; esta entrega conserva test como valor por defecto.

Referencias del proveedor: [monedas](https://docs.stripe.com/currencies), [confirmación de Checkout](https://docs.stripe.com/checkout/fulfillment), [firmas](https://docs.stripe.com/webhooks/signature), [idempotencia](https://docs.stripe.com/api/idempotent_requests), [creación de sesiones y métodos elegibles](https://docs.stripe.com/api/checkout/sessions/create) y [reenvío local con CLI](https://docs.stripe.com/cli/listen).

## API agregada

Todas las rutas, excepto el webhook firmado, requieren JWT con perfil autorizado.

| Ruta bajo `/api/` | Método | Uso |
|---|---|---|
| `clinica/incidencias/` | POST | Colecta interrumpida |
| `clinica/protocolos/` | POST | Aprobación institucional |
| `clinica/ubicaciones/{id}/condiciones/` | POST | Temperatura y agitación verificadas |
| `clinica/diferimientos/{id}/comunicar/` | POST | Comunicación efectuada |
| `clinica/madres/{id}/baja/` | POST | Baja del lote completo |
| `clinica/componentes/{id}/custodia-autologa/` | POST | Traslado exclusivo |
| `clinica/madres/{id}/reactivar-autologa/` | POST | Revisión de reserva tras corrección |
| `finanzas/catalogo/` | GET | Obligaciones, pagos, comprobantes y eventos |
| `finanzas/deudas/` | POST | Crear obligación |
| `finanzas/deudas/{id}/abonos/` | POST | Abono manual |
| `finanzas/deudas/{id}/checkout/` | POST | Crear/reintentar el mismo Checkout |
| `finanzas/deudas/{id}/moneda/` | POST | Confirmar moneda histórica |
| `finanzas/pagos/{id}/conciliar/` | POST | Consultar Stripe y conciliar |
| `finanzas/pagos/{id}/anular-checkout/` | POST | Expirar sesión abierta en Stripe |
| `finanzas/solicitudes/{id}/tratamiento/` | POST | Exoneración/convenio |
| `finanzas/stripe/webhook/` | POST | Notificación firmada |
| `reportes/catalogo/` | GET | Fuentes, indicadores, filtros y opciones |
| `reportes/consulta/` | GET | `fuente`, `dimension`, fechas y filtros del catálogo; `formato=json/csv/pdf` |

Los contratos exactos están en los serializers. Las opciones SQL provienen del catálogo del servidor, los valores se parametrizan y no se admite SQL del navegador. Stock y cartera son estados actuales y rechazan rangos históricos. Se excluyen citas canceladas del denominador de asistencia e indeterminados del denominador de reactividad; una división sin denominador devuelve null/No aplica. Recaudación suma pagos confirmados BOB, nunca los comprobantes. Los intentos pendientes no integran el denominador de confirmación. CSV protege celdas que podrían interpretarse como fórmulas y PDF pagina todos los resultados. Máximo 5000 grupos por consulta: se rechaza el exceso y no se presentan totales truncados.

El catálogo financiero lista hasta 200 obligaciones/solicitudes, 300 pagos y 100 comprobantes/eventos recientes. Los indicadores consultan toda la fuente dentro del período elegido; los contadores de los listados no se presentan como totales históricos.

## Pruebas realizadas

- 38 pruebas PostgreSQL local: clínica, conservación, exclusividad, correcciones, concurrencia, liberación conjunta, auditoría, finanzas, idempotencia, webhook firmado, conciliación, moneda, permisos, migración incompleta, denominadores y exportaciones.
- 29 pruebas existentes de seguridad, donantes e inventario; 3 pruebas puras de configuración; 2 de preflight CORS.
- 4 pruebas de navegador con API controlada: fallo/reintento de Checkout, abono rechazado y corregido, filtros/exportación/error de CU24 y protocolo sin agitación. Escritorio y móvil sin desbordamiento horizontal.
- Prueba adicional del frontend, HTTP Django y PostgreSQL local reales: creación con pago posterior, abono de 25 BOB, saldo de 75 BOB, recaudación CU24 de 25 BOB y exportación PDF.
- Dos pagos de Stripe sandbox, con Checkout externo, conciliación, recepción auténtica del webhook por CLI (HTTP 200), repetición firmada del evento y consulta CU24. Las 38 pruebas PostgreSQL se repitieron después de corregir el contrato de creación de sesiones.
- Compilación TypeScript + Vite, 2 comprobaciones de arquitectura del frontend y Django check aprobados. Actualizaciones compatibles del lockfile eliminaron las 4 alertas detectadas por npm audit; auditoría final sin alertas.

Las pruebas PostgreSQL vacían **solo** la base desechable `hemo_liberacion_test` en `127.0.0.1:55439`, usuario `hemovida_test`, restaurada sin datos desde el esquema de referencia y con 06 y 07. No utilizan DATABASE_URL de Supabase. Requieren esa copia local previamente preparada.

Desde la carpeta `backend`:

```powershell
..\.venv\Scripts\python.exe -m unittest tests_ciclo3_postgres.Cycle3Tests tests_liberacion_postgres.LiberacionPostgresTests -v
..\.venv\Scripts\python.exe manage.py test apps.seguridad apps.donantes apps.inventario tests_cors --noinput
..\.venv\Scripts\python.exe tests_database_config.py
..\.venv\Scripts\python.exe verificar_conexion.py
```

Desde `frontend`:

```powershell
npm ci
npm run build
npm test
# Con Vite ejecutándose en puerto 3000; no contacta Supabase/Stripe:
npm run test:browser
```

Las pruebas de navegador usan Edge instalado en Windows; en Linux requieren Chromium instalado mediante `npx playwright install chromium`. Sus capturas se guardan en `.venv`, fuera de Git. No reutilizan sesiones ni credenciales del usuario.

## Estado de entrega

Código disponible localmente en la rama secundaria. Base remota verificada sin modificar sus datos. Checkout y webhook externo quedaron validados en modo test contra PostgreSQL local. Falta publicar backend/frontend y registrar el endpoint webhook público para probar el flujo desplegado en Render/Cloudflare. La activación y las claves live son un paso diferente; no se realizaron cobros reales. No se hizo push ni despliegue. Los protocolos de conservación de producción deben ser aprobados por el responsable institucional; no se crearon por las pruebas locales.


## Primer bloque de cierre del ciclo 3

Se añadió el KPI tasa de diferimiento: evaluaciones con resultado Rechazado entre evaluaciones del mismo período y filtros. No cuenta filas de diferimiento ni promedia porcentajes de grupos; el total se obtiene de los conteos globales filtrados. Sin denominador devuelve No aplica. El catálogo, las tarjetas, el gráfico y las exportaciones incluyen el indicador.

Se implementó la matriz de reportes confirmada por el usuario, manteniendo finanzas en ADMIN. Los perfiles solo reciben fuentes autorizadas en el catálogo y la API rechaza accesos directos y exportaciones de otras áreas. El frontend inicia cada perfil con una fuente autorizada, incluyendo logística, y descarta resultados al cambiar de perfil.

Pruebas de este bloque: 41 pruebas PostgreSQL (incluyen indicadores ponderados, filtros, casos vacíos y la matriz de acceso de consulta/exportación), 5 de navegador y compilación TypeScript/Vite. No requiere migración ni se aplicaron los SQL de población. Las pruebas de escritura utilizaron únicamente PostgreSQL local aislado.

Decisión confirmada: las correcciones ABO/Rh corresponden exclusivamente al perfil BIOQ_INTEGRAL. El cierre completo del ciclo 3 sigue pendiente de las revisiones clínicas y de coherencia con procedimientos heredados del plan.

Se corrigió además el corte de fechas de CU24: filtros, agrupaciones diarias/mensuales y vencimiento de stock usan America/La_Paz. Las columnas heredadas sin zona se interpretan como UTC, igual que las escrituras nuevas con la conexión UTC de Django; las financieras mantienen su timestamptz. Un ensayo de cambio de día/mes verifica que 02:00 UTC del 1 de noviembre pertenezca al 31 de octubre local y 05:00 UTC al 1 de noviembre local. No se modificaron timestamps históricos. La interpretación de fechas heredadas introducidas por otros sistemas debe revisarse si no siguen esa convención.


## Correcciones ABO/Rh: Bioquímico Integral

El usuario confirmó que el responsable de las correcciones ABO/Rh es BIOQ_INTEGRAL. Se implementó en la API y en Laboratorio. Una cuenta con varios roles debe seleccionar ese perfil; ADMIN por sí solo no autoriza esta operación. Se conserva el resto de los permisos existentes de registro y liberación. Esta decisión no amplía automáticamente los permisos para corregir otros resultados.

- Corregir ABO/Rh de un análisis existente exige BIOQ_INTEGRAL y `motivo_correccion` (10–120 caracteres). La comprobación también impide usar POST para registrar otro grupo y eludir el permiso de corrección. Se registra un evento específico con grupo anterior/nuevo, motivo y actor, además de la auditoría por fila de 06.
- `POST /api/laboratorio/madres/{id}/corregir-grupo/` concilia la clasificación de madre y derivados con el último CU14 Post-Extraccion certificado Apto. Cuerpo: `idgrupo_anterior`, `idanalisishematologico`, `grupoaboconfirmado`, `factorrhconfirmado`, `motivo` y `confirmada=true`. Los campos de referencia se comparan con los valores vigentes bajo bloqueo para rechazar formularios desactualizados. El destino se obtiene del análisis, no de un grupo arbitrario enviado por el navegador.
- Requiere profesional vinculado, rol realmente asignado, motivo y confirmación del análisis y rotulado. El programa no imprime ni certifica por sí mismo el cambio físico de etiqueta.
- Actualiza madre y todos sus derivados de forma atómica, cancela reservas activas y deja el lote en cuarentena. Se conserva la marca de exclusividad autóloga. La nueva liberación sigue siendo expresa y requiere CU13/CU14 aprobados; las reservas autólogas canceladas requieren su revisión y reactivación específica.
- Bloquea lotes rechazados y componentes dados de baja/despachados, referencias de entrega o pruebas pretransfusionales, e inconsistencias de grupos previos. Para autólogos exige concordancia con el grupo registrado del receptor; no cambia su historia automáticamente. Esas situaciones requieren revisión específica, no una sobrescritura histórica.
- La decisión se registra como `correccion_grupo` en bitácora; es un evento de negocio diferente de los cambios de filas que auditan los triggers existentes. No añade una tabla ni duplica el evento genérico de actualización.

Validación: 48 pruebas PostgreSQL y 7 pruebas de navegador aprobadas, compilación TypeScript/Vite y Django check. Prueba adicional web → HTTP Django → PostgreSQL local real: un BIOQ concilió O Positivo a A Positivo según CU14, recargó el registro en cuarentena y solicitó después su liberación conjunta. Se verificaron permisos, motivo, confirmación, datos desactualizados, rollback ante fallo de auditoría, bajas, pruebas pretransfusionales y conservación de la reserva autóloga. No se escribieron datos de prueba en Supabase, no se aplicó la población propuesta y no se requiere una nueva migración para este bloque.
