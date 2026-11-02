# Webhook Stripe: diagnóstico y prueba integral local

Fecha: 2026-11-01. Se mantienen los reportes en CSV y PDF; no se añade XLSX.

## Diagnóstico

La clave local de Stripe test funciona. El secreto de backend/.env coincide con el secreto obtenido por Stripe CLI para esa cuenta. La ruta POST /api/finanzas/stripe/webhook/ existe y rechaza solicitudes sin firma con HTTP 400.

No había un proceso local de Stripe CLI reenviando eventos. La lista de endpoints registrados de la cuenta consultada estaba vacía, pero eso no impide trabajar mediante CLI: la CLI reenvía eventos a localhost sin requerir un endpoint público registrado. No fue necesario cambiar claves, variables de entorno ni código del webhook.

Referencia oficial: [pruebas locales de webhooks con Stripe CLI](https://docs.stripe.com/webhooks#local-listener).

## Prueba externa completa, en modo test

Se inició temporalmente el backend en 8010 contra la BD PostgreSQL desechable hemo_liberacion_test en 127.0.0.1:55439. Las operaciones financieras de esta prueba no tocaron Supabase.

1. El endpoint de Checkout del backend creó una sesión real de Stripe test por 100 BOB: HTTP 201.
2. Se abrió Checkout alojado en Edge y se completó con un medio de prueba de Stripe. No se realizó un cargo real.
3. Stripe CLI recibió checkout.session.completed y lo reenvió a la ruta del backend aislado.
4. El webhook respondió HTTP 200 y verificó la sesión real con Stripe.
5. Stripe devolvió payment_status=paid; PostgreSQL local mostró pago Confirmada, monto abonado 100.00 y saldo pendiente 0.00.
6. Se comprobó un comprobante y un evento persistido.
7. Un reenvío controlado del mismo evento, con firma válida, devolvió HTTP 200 y repetido=true, sin volver a procesar el pago.

No se inventó una confirmación manual para obtener el resultado. La primera entrega fue un evento real recibido mediante Stripe CLI; el reenvío posterior fue una petición de prueba firmada con el secreto local para verificar deduplicación.

## Operación local habitual

Se cerraron el backend aislado 8010 y su reenvío de pruebas. Se inició el lanzador normal `backend/escuchar_stripe.py`, que reenvía a:

`http://127.0.0.1:8000/api/finanzas/stripe/webhook/`

Para repetir el uso local, mantener activos backend, frontend y `iniciar_stripe_local.bat`. El lanzador valida modo test y coincidencia del secreto y oculta claves en consola. Si se cierra Stripe CLI, el backend local deja de recibir ese reenvío. Su estado debe comprobarse al iniciar cada sesión; no se instaló como servicio persistente.

Para Render se necesita un destino HTTPS registrado en Stripe y el secreto de ese destino en Render. Ese secreto puede ser distinto del de CLI local. Esta revisión no cambió ni validó la configuración remota de Render/Cloudflare.

## Alcance

La prueba pendiente del informe TEST_INTEGRACION_Y_REPORTES_2026-11-01.md queda resuelta para el recorrido local aislado con Stripe test. No certifica pagos live ni despliegues remotos. Se preservaron los datos de Supabase, las variables de entorno, los formatos CSV/PDF y los diagramas.
