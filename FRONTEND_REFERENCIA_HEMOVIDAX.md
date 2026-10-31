# Adaptación visual desde HEMOVIDAX-main (2).zip

Se usa el ZIP aportado como referencia de frontend, sin sustituir el backend, el esquema ni las variables de entorno actuales.

## Presentación adaptada

- Portada y barra institucional de la referencia.
- Cabeceras por rol: administración oscura, triaje azul, laboratorio verde azulado, recepción rosa y logística roja.
- Navegación por módulos con iconos y selección oscura.
- Inicio del personal con tarjetas de madres, triajes y componentes consultados. Las cifras corresponden a las listas acotadas que devuelve la API, no a totales globales de CU24.
- Inicio del donante con saludo, código de carnet, historial aportado, grupo y descanso según la respuesta del backend actual.
- Carnet con degradado oscuro, QR del código persistido, evaluación y tabla de historial. Un grupo no confirmado sigue pendiente de tipificación.
- Listados tabulares para resultados, personal, inventario y bitácora; formularios con tipografía, separación, bordes, botones y colores de la referencia.

## Contrato conservado

El ZIP de referencia utiliza otros nombres de campos, URLs y forma de sesión. No se copiaron sus clientes cloudApi ni sus formularios clínicos como implementación operativa. Se adaptaron los elementos visuales a las rutas actuales:

- /api/clinica/operaciones/, triajes/, diferimientos/, colectas/, fraccionar/, custodiar/ y baja/.
- /api/laboratorio/ con análisis CU13/CU14 y liberación conjunta.
- /api/donantes/{ci}/carnet/ y sus campos camelCase del backend actual.
- /api/personal/, /api/usuarios/{id}/estado/, /api/stock/ y /api/auditoria/.

Se mantienen JWT con perfil firmado, credenciales privadas del backend y sesión de pestaña. No se reactivaron mocks, persistencia de operaciones en localStorage ni liberaciones locales. Las citas y otros módulos sin API integrada siguen señalados como pendientes; no se presentan como implementados por copiar una pantalla del ZIP.

## Validación

- npm test: pruebas del recorrido operativo sin mocks ni persistencia local y del chequeo de tipos en build.
- npm run build: TypeScript y Vite aprobados.
- Edge headless con API interceptada y datos sintéticos: portada, resumen administrativo, cabecera por rol, formularios, resumen del donante, carnet/QR, historial tabular, API fallida sin cifras inventadas y tamaño móvil de 390 px. Inspección visual de capturas de escritorio.
- No se escribieron datos de prueba en Supabase, no se modificó el backend ni se desplegó código.

Trabajo en codex/ciclo3-desarrollo-local.
