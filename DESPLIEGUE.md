# Despliegue de HemoVida

Repositorio: https://github.com/SIEXECUTION/HemoVida

## Ramas

`main` es la versión integrada; `codex/ciclo3-desarrollo-local` es la rama de trabajo. Ambas usan estas instrucciones. Selecciona la rama en cada servicio: el commit no modifica esa selección. Para publicar pruebas independientes utiliza otro Worker y otro servicio Render, con sus propias variables.

## Cloudflare Workers

- Worker: `hemovida-banco-de-sangre`.
- Raíz: `frontend`; Node 22.
- Build: `npm ci && npm run build`.
- Deploy: `npm run deploy`.
- Versiones no productivas: `npx wrangler versions upload`; no publica automáticamente en producción.
- Variable de build: `VITE_API_BASE_URL=https://hemovida-backend.onrender.com/api`.

La SPA usa `assets.not_found_handling=single-page-application`, sin `_redirects` ni `wrangler preview`. Las variables Vite se incorporan al compilar: requieren un nuevo build y no van en Runtime del Worker estático. No publiques claves privadas en Vite.

Frontend: https://hemovida-banco-de-sangre.siexecution2026.workers.dev/

## Render y Supabase

Backend: https://hemovida-backend.onrender.com

Raíz `backend`, Python 3.12, build `bash build.sh`, inicio `gunicorn hemovida_project.wsgi:application --bind 0.0.0.0:$PORT --workers 2`, health check `/api/health/`. El Blueprint no fija una rama: selecciona la deseada en Render. Revisa los ajustes del servicio existente; editar YAML no reconfigura por sí solo un servicio creado manualmente.

Variables de Render:

- `DEBUG=False`, `USE_SQLITE=False`, `SUPABASE_TRANSACTION_POOLER=True`.
- `ALLOWED_HOSTS=hemovida-backend.onrender.com,localhost,127.0.0.1`.
- `SECRET_KEY`: secreto propio y estable del servicio.
- `DATABASE_URL`: URI completa del Transaction pooler de Supabase, puerto **6543**, `sslmode=require`, contraseña codificada en la URI.
- `CORS_ALLOWED_ORIGINS=https://hemovida-banco-de-sangre.siexecution2026.workers.dev` (con protocolo).
- `PAYMENT_FRONTEND_URL=https://hemovida-banco-de-sangre.siexecution2026.workers.dev`.
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`: clave API y remitente verificado.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MODE=test`: misma cuenta y entorno.

Webhook: `https://hemovida-backend.onrender.com/api/finanzas/stripe/webhook/`. Usa el secreto del destino público de Stripe; el del listener CLI es únicamente local.

El build no aplica SQL ni puebla datos. Las migraciones de `database/` se administran por separado en Supabase. No ejecutes nuevamente el esquema maestro sobre la base existente.

## Verificación

Tras terminar ambos despliegues, confirma el commit publicado, consulta `/api/health/`, inicia sesión desde Cloudflare y comprueba en Network que la API apunte al backend actual sin errores CORS. Revisa una consulta persistida y un pago Stripe test con webhook, saldo e idempotencia. La compilación local no acredita la configuración remota.

## Limpieza

Se conservan código, pruebas, migraciones, scripts locales y documentación útil. Los entregables Word/PDF de `output/` quedan fuera de Git y permanecen en el equipo. Se retiraron restos de AI Studio y configuraciones de Fly, Vercel y Oracle ajenas al despliegue actual. Docker sigue disponible para desarrollo local.

Referencias: [Cloudflare Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Blueprint de Render](https://render.com/docs/blueprint-spec).
