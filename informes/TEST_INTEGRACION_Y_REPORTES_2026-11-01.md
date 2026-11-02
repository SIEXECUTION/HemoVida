# Verificación de integración, Stripe y exportaciones

Fecha de la revisión: 2026-11-01. Entorno: frontend local 3000, backend local 8000, PostgreSQL de Supabase por TLS / 6543.

Actualización posterior: el recorrido externo pendiente se completó con Stripe test y una BD local aislada. Véase [WEBHOOK_STRIPE_VALIDADO_LOCAL_2026-11-01.md](WEBHOOK_STRIPE_VALIDADO_LOCAL_2026-11-01.md). Los resultados siguientes conservan el diagnóstico de la primera revisión.

## Resultados comprobados

| Área | Evidencia | Resultado |
|---|---|---|
| Supabase real | SELECT 1 y catálogo en transacción de solo lectura | Conexión correcta; 49 tablas |
| Backend local | GET /api/health/ | HTTP 200 |
| Proxy del frontend | GET /api/health/ desde 3000 | HTTP 200 |
| Autenticación real DEMO | Login y selección ADMIN contra el backend | HTTP 200 en ambos |
| Navegador → frontend → backend → Supabase | Fetch real desde Edge, sin interceptar respuestas | CU23 y CU24: JSON, PDF y CSV HTTP 200 |
| PDF real | Cabecera de bytes %PDF- | Correcta en ambos casos |
| Backend y PostgreSQL desechable local | unittest: ciclos 2/3, configuración y CORS | 112 pruebas correctas |
| Frontend, comprobaciones estáticas | npm test | 2 correctas |
| Frontend, navegador con API controlada | npm run test:browser | 15/16 correctas en la ejecución conjunta |
| Caso de guía de recorrido repetido solo | --test-name-pattern="La guía" | Correcto |
| Compilación | TypeScript y Vite | Correcta |
| API externa Stripe test | Crear, recuperar y expirar sesión de 100 BOB | Correcta; sin pago ni cargo |
| Endpoints de Stripe, cuenta de la clave local | WebhookEndpoint.list | Lista vacía |

La prueba real del navegador usó una cuenta DEMO existente y no reemplazó respuestas del servidor. No se guardaron operaciones clínicas o financieras en Supabase; login y consultas pueden producir auditoría normal. Las pruebas que crean, borran o alteran datos se ejecutaron en la BD local desechable hemo_liberacion_test, nunca en Supabase.

Las pruebas de navegador de la suite usan API controlada: verifican comportamiento de interfaz, no constituyen por sí solas integración con Supabase o Stripe. Se complementaron con las seis descargas/consultas reales desde el navegador. La suite conjunta perdió el proceso Edge antes del último caso de ciclo 2; se reprodujo en ese archivo completo, pero el mismo caso pasó al ejecutarlo individualmente. No se declara una ejecución conjunta 16/16 correcta.

## Stripe: qué funciona y qué sigue pendiente

Se verificó una clave sk_test sin mostrarla ni copiarla al informe. Se creó una sesión real de pruebas por 100 BOB, se recuperó y se expiró. Un intento inicial de 1 BOB fue rechazado por el mínimo admitido por Stripe; no se modificó el backend para eludir esa validación.

Esto demuestra conectividad y aceptación de Checkout en BOB para el importe probado. No demuestra pago exitoso ni confirmación extremo a extremo de un webhook. No se pagó la sesión ni se creó un pago local ficticio para simular éxito.

La cuenta/modo consultados mediante la clave local no tienen endpoints registrados en Stripe. Un secreto whsec en .env no crea el destino. Una escucha de Stripe CLI para localhost puede existir sin aparecer en esa lista; su entrega tampoco se comprobó en esta revisión. La configuración de Render puede usar otra clave/cuenta, por lo que este resultado no permite afirmar que el despliegue remoto tenga la misma configuración.

Para cerrar la prueba integral se necesita Stripe CLI reenviando al backend local con su secreto correspondiente, o un endpoint test registrado hacia el backend público. Después, completar Checkout con un medio de prueba y verificar evento, respuesta del webhook, pago confirmado, saldo, comprobante y ausencia de duplicación al reenviar el evento. El backend ya tiene pruebas con firma y Stripe simulado para esa lógica; faltó comprobar el recorrido externo completo.

## PDF, CSV y Excel: situación e impacto

CU23 (ciclo 2) y CU24 (ciclo 3) ya ofrecen PDF y CSV en backend y frontend. Se comprobaron ambos formatos con datos reales. CSV puede abrirse en Excel, pero no es un archivo Excel nativo .xlsx. No existe exportación XLSX actualmente.

Añadir XLSX sería una ampliación de CU23/CU24, sin crear otro caso de uso ni requerir una migración de BD si se exporta el resultado existente. Debe respetar filtros y permisos del servidor, mantener finanzas exclusivamente en ADMIN, conservar tipos numéricos/fechas y evitar interpretar texto no confiable como fórmulas. Se requieren pruebas de contenido, descarga y acceso por rol en ambos reportes.

Los diagramas de dominio y relacional no necesitarían cambiar por añadir un formato de archivo. Las fichas de CU23/CU24 y los detalles de secuencia, clases y componentes de exportación sí deben actualizarse si cambian contratos o módulos. El generador extrae firmas e importaciones del código y conserva hashes de procedencia: después del cambio hay que regenerar y revisar esos diagramas. No se implementó XLSX durante esta revisión; la solicitud fue evaluar su impacto.

## Repetición de pruebas existentes

Desde backend:

```powershell
../.venv/Scripts/python.exe -m unittest tests_ciclo3_postgres tests_ciclo2_completion_postgres tests_database_config tests_cors
```

Requiere PostgreSQL desechable local configurado por la suite. Desde frontend:

```powershell
npm test
npm run test:browser
npm run build
node --test --test-name-pattern="La guía" tests/ciclo2.browser.cjs
```

No se verificaron Cloudflare/Render en producción. Los resultados describen el entorno local y el acceso a Supabase y Stripe test usados en esta revisión. No se modificaron las variables de entorno, diagramas, esquema ni servicios desplegados.
