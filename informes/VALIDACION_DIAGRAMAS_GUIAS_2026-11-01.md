# Sustitución de diagramas según las guías del usuario

Fecha: 2026-11-01. Rama: `codex/ciclo3-desarrollo-local`.

Se sustituyeron los diagramas de HemoVida hasta el ciclo 3 tomando como referencia los ocho archivos de `C:\Users\Sebas\Desktop\DIAGRAMAS`. El PDF de secuencias se extrajo y renderizó para revisar su notación; se utilizó en particular el ejemplo de la página 24.

## Cambios

- Nuevos escenarios conceptuales por caso, con entidades del negocio y patrón frontera/control/entidad. Se retiró la generación basada en un objeto genérico PostgreSQL y la lista antigua de eventos genéricos.
- Actividades con acciones redondeadas, rombos y carriles; secuencias con objetos rectangulares, activaciones, retornos y alternativas.
- Comunicación con instancias subrayadas, numeración Dewey, un enlace estructural por pareja y dirección en los mensajes.
- Clases de análisis con atributos y responsabilidades, sin iconos de clase o pictogramas especiales de frontera/control.
- Vistas por ciclo, estructuras funcionales, consolidado de actores principales, trazabilidad general del CU12 y modelo de negocio. El consolidado se complementa con la matriz y las vistas completas de actores por ciclo.
- Se conservaron los 19 casos y su distribución de ciclos. No se modificaron reglas, rutas ni fichas; se verificó la igualdad de su contenido respecto del commit anterior, excluyendo solo los eventos genéricos retirados.
- Se retiraron los seis generales anteriores de la salida: arquitectura lógica, despliegue, dominio, liberación, pago Stripe y paquetes. Su información pertinente queda en las nuevas realizaciones y vistas; no se alteraron los servicios del proyecto.

## Validación local

| Comprobación | Resultado |
|---|---|
| Generación completa con PlantUML 1.2026.9 y Java 21 | 104 PNG, 104 SVG y 104 fuentes |
| Decodificación de imágenes PNG con Pillow | 104 correctas |
| Análisis XML y revisión de avisos de SVG | 104 correctos; cero avisos técnicos en las imágenes |
| Comparación de fuentes contra constructores actuales | 104 coincidencias |
| Comunicación: un enlace por pareja | 19 diagramas sin duplicaciones |
| Compilación de módulos Python | Correcta |
| Filtro de secuencias de ciclo 2 | 6 fuentes correctas |
| Ausencia de Java | Error claro y salida no exitosa |
| Limpieza de archivos obsoletos del índice | Retira los propios; conserva archivos manuales y externos |
| Sustitución en la salida definitiva | 104 elementos de cada formato; ningún general antiguo |
| Galería final | 104 previsualizaciones; enlaces a PNG, SVG y PlantUML |

Se revisaron visualmente ejemplos de las cinco representaciones, incluidos colecta, corrección de grupo y Stripe; también las estructuras, el panorama general y el consolidado. Las vistas extensas deben ampliarse como SVG; para el cuerpo del Word se recomienda usar las vistas por ciclo.

## Entrega

`output/diagramas_hemovida/galeria.html`, con `LEEME.md`, índices, matriz de casos, validación e integridad SHA-256. El generador se ejecuta con `generar_diagramas.bat`. Las imágenes son regenerables y continúan excluidas de Git; se versionan el generador, los escenarios y la documentación.

Se conservaron las guías originales, las capturas reales del frontend y los documentos Word. No se accedió a Supabase ni se modificaron backend, frontend o despliegues. Estos resultados validan la generación documental local, no el funcionamiento clínico ni el estado de producción.
