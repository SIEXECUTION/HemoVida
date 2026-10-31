# Ciclo 3: implementación y validación local

Estado al 31 de octubre de 2026. Rama: `codex/ciclo3-desarrollo-local`.
Este documento actualiza el estado de los informes anteriores. El código y las pruebas son locales; no se publicó este cambio en Render ni Cloudflare.

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

Finanzas, consultas y aprobación de protocolos requieren ADMIN. Los roles clínicos mantienen sus permisos específicos, verificados contra el rol activo del JWT y los roles realmente asignados. No se cambió el mecanismo de contraseñas ni el envío de Brevo.

## Conservación y comunicación

Los protocolos de conservación deben ser aprobados por el responsable institucional desde Atención clínica. No se insertan valores clínicos ficticios como configuración de producción. El backend exige protocolo existente, temperatura válida y agitación cuando corresponda antes de fraccionar o trasladar. La caducidad deriva del protocolo aprobado.

Confirmar comunicación CU11 registra una comunicación efectuada por un profesional; no envía automáticamente un correo clínico. Las reglas previas de peso, hemoglobina, temperatura, descanso biológico y vigencia del triaje continúan siendo restricciones del proyecto; esta entrega no certifica un protocolo médico integral ni el circuito de retiro de componentes ya despachados.

## Finanzas y Stripe

Importes de nuevas obligaciones: BOB. Las obligaciones históricas sin moneda permanecen excluidas de los indicadores monetarios y bloqueadas para cobro hasta que un administrador confirme su moneda original. Confirmar BOB no convierte cantidades.

Stripe Checkout se crea en el backend con importe en centavos BOB, pago con tarjeta y clave de idempotencia persistida. No se necesita clave pública Stripe en el frontend, que abre el enlace HTTPS del Checkout alojado. El regreso del navegador no confirma pagos. El webhook comprueba firma, modo, sesión consultada a Stripe, moneda, importe y referencia antes de registrar el abono.

Una repetición del evento no duplica el ingreso. Un evento antiguo no revierte un pago confirmado. La conciliación consulta el estado real del proveedor y permite expirar sesiones todavía abiertas. Un error de red conserva el intento para reintentar con la misma clave; un rechazo definitivo de parámetros lo marca rechazado. Si un intento incierto sin sesión supera 23 horas se bloquea su recreación: requiere revisión en el panel Stripe antes de cobrar de nuevo, por la posible caducidad de la idempotencia del proveedor. Mientras existe un intento pendiente se bloquea otro abono sobre la misma deuda. Si los fondos recibidos exceden el saldo, se señala conciliación administrativa sin duplicar ni forzar el abono.

La implementación de Stripe se probó con su SDK instalado y respuestas externas controladas; **no se validó un pago contra la cuenta real ni sandbox externo**: se verificó la clave de prueba con una consulta de solo lectura a la API de Stripe (país US), pero falta STRIPE_WEBHOOK_SECRET. No se ha declarado ese cobro como completado. La cuenta devolvió charges_enabled=False; su habilitación para cobros reales requiere revisión en Stripe.

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

Guardar el `whsec_...` correspondiente y reiniciar Django. Crear una deuda de prueba mediante la aplicación, abrir su Checkout y pagar en modo test; verificar abono único y saldo tanto por webhook como conciliación, incluyendo reenvío del evento. Un evento genérico del CLI sin sesión creada por HemoVida será rechazado. Para producción se requieren claves de la misma cuenta en modo live y validación operativa previa; esta entrega conserva test como valor por defecto.

Referencias del proveedor: [monedas](https://docs.stripe.com/currencies), [confirmación de Checkout](https://docs.stripe.com/checkout/fulfillment), [firmas](https://docs.stripe.com/webhooks/signature), [idempotencia](https://docs.stripe.com/api/idempotent_requests).

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

Código disponible localmente en la rama secundaria. Base remota verificada sin modificar sus datos. Falta aportar STRIPE_WEBHOOK_SECRET y validar un Checkout externo, configurar su webhook y publicar backend/frontend para probar el flujo en Render/Cloudflare. No se hizo push ni despliegue. Los protocolos de conservación de producción deben ser aprobados por el responsable institucional; no se crearon por las pruebas locales.
