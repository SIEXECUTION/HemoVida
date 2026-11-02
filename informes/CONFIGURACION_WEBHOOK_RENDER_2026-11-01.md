# Webhook Stripe directo hacia Render

Se creó un destino Stripe **test**, habilitado, en la cuenta de la clave local, con URL:

`https://hemovida-backend.onrender.com/api/finanzas/stripe/webhook/`

Eventos: checkout.session.completed, checkout.session.expired, checkout.session.async_payment_succeeded y checkout.session.async_payment_failed. Se utilizó la API oficial de endpoints, evitando duplicar el destino si ya existía.

La ruta pública responde; una petición sin firma devuelve HTTP 400. También se comprobó que Render no acepta el secreto de CLI local. No se conoce el secreto actualmente configurado en Render y no se afirma que sea incorrecto para otro destino; el nuevo destino requiere su propio secreto.

## Paso pendiente en Render

Las variables concretas están preparadas en el archivo privado `.venv/stripe_render/variables_render.env`, excluido de Git. Contiene STRIPE_MODE=test, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET del nuevo destino y PAYMENT_FRONTEND_URL de Cloudflare. No pegar claves en el chat ni subir este archivo al repositorio.

En Environment del servicio hemovida-backend, copiar los cuatro valores de ese archivo y guardar/redesplegar. La nueva STRIPE_WEBHOOK_SECRET se configura **solo en Render**; backend/.env conserva el secreto de CLI para trabajar localmente. No se necesitan secretos Stripe en Cloudflare.

No hay un conector ni una sesión de administración de Render disponible para aplicar estas variables desde esta tarea. Crear el destino Stripe no configura automáticamente el entorno de Render. El destino ya existe; no crear otro.

Después de que el despliegue figure como Live:

```powershell
.venv/Scripts/python.exe backend/verificar_stripe_render.py
```

El resultado esperado es HTTP 200. La prueba envía un evento diagnóstico firmado de tipo ignorado: comprueba ruta, modo test y aceptación del secreto, sin crear pagos ni modificar Supabase. No es evidencia de que Stripe haya entregado un pago real de prueba.

Para cerrar el recorrido remoto, crear Checkout desde el frontend desplegado y completarlo con un medio de prueba; revisar entrega HTTP 200 en Stripe y pago confirmado, saldo y comprobante en HemoVida. No usar las sesiones de la prueba aislada local, que no tienen intento asociado en Supabase.

## Disponibilidad

En nube, Stripe envía directamente por HTTPS a Render y no necesita Stripe CLI ni un equipo personal encendido. El plan free de Render puede suspender la instancia por inactividad y demorar la respuesta inicial. Para disponibilidad continua se necesita un servicio sin suspensión; no se cambió el plan ni se contrató ningún servicio.

Esto prepara pruebas académicas en nube. Pasar a cobros live exige un destino live, clave live y secreto live del mismo entorno, además de su validación independiente; no se habilitaron cobros reales.

Fuentes oficiales: [Stripe webhooks](https://docs.stripe.com/webhooks), [creación del destino](https://docs.stripe.com/api/webhook_endpoints/create), [limitaciones del plan free de Render](https://render.com/docs/free#spinning-down-on-idle).
