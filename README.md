# HemoVida

Sistema de información web para la gestión de donaciones, laboratorio, inventario y finanzas del Banco de Sangre y Servicio de Transfusión Dr. Zuna. Proyecto académico de Sistemas de Información I de la Universidad Autónoma Gabriel René Moreno.

## Presentación

- [Página de producción](https://hemovida-banco-de-sangre.siexecution2026.workers.dev/)
- [Memoria del proyecto en PDF](informes/presentacion/HEMOVIDA_MEMORIA_PRESENTACION.pdf)
- [Modelo de dominio en PlantUML](informes/presentacion/modelos/01_modelo_dominio.puml)
- [Diagrama de clases en PlantUML](informes/presentacion/modelos/02_diagrama_clases_completo.puml)

## Alcance por ciclo

| Ciclo | Funcionalidades |
| --- | --- |
| 1 | Acceso y roles, bitácora de auditoría, alertas de stock y perfil del donante con carnet digital, historial y categoría etaria. |
| 2 | Prefiltro, agenda, admisión y registro de incentivos, programación de colectas autólogas y reportes predefinidos. |
| 3 | Evaluación y diferimientos, colecta, laboratorio y liberación conjunta, inventario, cuentas por cobrar, Stripe Checkout en modo de prueba y consultas dinámicas. |
| 4 | CU25 del asistente de reportes en lenguaje natural, con permisos por rol y exportación CSV y PDF. Los CU16 a CU20 del circuito hospitalario figuran como diseño pendiente. |

## Recorrido de demostración

1. Abrir el portal y revisar el perfil de un donante DEMO, su carnet e historial.
2. Recorrer la agenda y revisar la trazabilidad de un registro de demostración desde la cita hasta el inventario, cambiando al rol correspondiente.
3. Desde Administración, revisar una deuda DEMO y su comprobante o ejecutar un abono en el entorno de prueba de Stripe.
4. Consultar al asistente desde un perfil autorizado, descargar un reporte y comprobar el alcance del menú de consultas de ese rol.

La [guía de recorrido de los ciclos 2 y 3](informes/RECORRIDO_CICLOS_2_Y_3.md) describe los escenarios y perfiles DEMO. Las credenciales de acceso se administran fuera del repositorio.

## Arquitectura y ejecución

- [Frontend](frontend/) en React y Vite, desplegado en Cloudflare Workers.
- [Backend](backend/) con Django y Django REST Framework, desplegado en Render. [Estado de la API](https://hemovida-backend.onrender.com/api/health/).
- [Esquema y migraciones](database/) de PostgreSQL en Supabase, hasta la migración 12.
- Brevo para correo transaccional, Stripe para pagos de prueba y Gemini para interpretar consultas del asistente. Django aplica los permisos antes de consultar los datos.

Para trabajar localmente, consulta [Desarrollo local](DESARROLLO_LOCAL.md) y [las variables de ejemplo del backend](backend/.env.example). Para publicar, usa [la guía de despliegue](DESPLIEGUE.md). La [verificación de GitHub Actions](.github/workflows/checks.yml) comprueba el backend y ejecuta pruebas y compilación del frontend.

El entorno de demostración utiliza datos sintéticos. Un eventual uso asistencial requiere validación institucional.
