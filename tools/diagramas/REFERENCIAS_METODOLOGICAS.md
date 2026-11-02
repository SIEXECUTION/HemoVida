# Diagramas de HemoVida: referencias y alcance

Esta edición sustituye los diagramas del generador anterior. Se preparó con las ocho guías de `C:\Users\Sebas\Desktop\DIAGRAMAS`, manteniendo los casos y las reglas de HemoVida hasta el ciclo 3.

## Categorías

| Categoría | Cantidad | Ubicación |
|---|---:|---|
| Casos de uso individuales | 19 | `ciclo_N/casos_uso` |
| Actividades con carriles | 19 | `ciclo_N/actividades` |
| Secuencias | 19 | `ciclo_N/secuencias` |
| Comunicación | 19 | `ciclo_N/comunicacion` |
| Clases de análisis | 19 | `ciclo_N/clases_analisis` |
| Vistas de casos de uso por ciclo | 3 | `ciclo_N/vista_ciclo_N` |
| Estructura funcional por ciclo | 3 | `generales/estructura_ciclo_N` |
| Consolidado de los tres ciclos | 1 | `generales/consolidado_ciclos_1_2_3` |
| Trazabilidad general del sistema | 1 | `generales/general_sistema` |
| Modelo de negocio con carriles | 1 | `generales/modelo_negocio` |
| **Total** | **104** | PNG, SVG y PlantUML editable |

Ciclo 1: CU01–CU05. Ciclo 2: CU06–CU09, CU21 y CU23. Ciclo 3: CU10–CU15, CU22 y CU24. CU12 sigue siendo consentimiento y colecta; no se incluyen comandos de voz ni CU16–CU20 del ciclo posterior.

## Aplicación de las guías

| Referencia | Aplicación |
|---|---|
| `DIAGRAMA_DE_CASO_DE_USO.md` | Actores fuera de HemoVida, óvalos, infinitivos, asociaciones simples; `include` obligatorio y `extend` condicionado únicamente cuando corresponde. |
| `DIAGRAMA DE ACTIVIDADES O MODELO DE NEGOCIO.txt` | Acciones redondeadas, inicio y fin UML, rombos, flujo dirigido y carriles. Sin flujos de objetos innecesarios. |
| `diagrama de secuencia.pdf` | Objetos rectangulares, líneas de vida, activaciones, llamadas, retornos y fragmentos `alt`, `opt` y agrupaciones; ejemplo visual de la página 24. |
| `gu_a_para_clases_de_an_lisis.md` | Cajas `boundary`, `control`, `entity`, atributos conceptuales y responsabilidades de negocio. Sin iconos circulares de clase ni tablas físicas como sustituto del análisis. |
| `gu_a_para_diagramas_de_comunicaci_n.md` | Instancias subrayadas, numeración Dewey, un enlace no dirigido por pareja y flechas pequeñas junto a los mensajes. `→` y `←` indican solo su sentido de envío. |
| `gu_a_para_estructura_del_modelo_de_casos_de_uso.md` | Paquetes funcionales por ciclo y dependencias justificadas de consulta. La BD no es un paquete funcional. |
| `gu_a_para_diagrama_consolidado_de_casos_de_uso_por_ciclos.md` | Una frontera HemoVida, tres paquetes de ciclos, actores principales no duplicados y matriz de los 19 casos. |
| `gu_a_para_diagrama_general_del_sistema.md` | Capas de requisitos, análisis, diseño y despliegue previsto; trazas del CU12 hacia React, Django y el esquema existente de Supabase. |

Solo se utilizan actores UML, rectángulos, óvalos, acciones redondeadas, rombos, paquetes, componentes, nodos, notas, fragmentos y flechas convencionales de las referencias. No hay emojis ni iconos decorativos o especiales de frontera/control.

El consolidado muestra actores principales y participaciones clave (revisión biológica, receptor y Stripe). Las vistas por ciclo y la matriz conservan todas las participaciones; el consolidado no es una matriz de permisos. Para el cuerpo del Word conviene insertar las vistas por ciclo y dejar el consolidado SVG como panorama ampliable.

## Interpretación y escenarios

Las secuencias y comunicaciones son realizaciones conceptuales, no trazas de funciones Python. Los objetos entidad resumen responsabilidades del dominio y pueden agrupar varias tablas. `Evaluación de origen` representa un triaje **o** un análisis de laboratorio, no una tabla nueva. Los catálogos de reportes representan listas permitidas del servicio.

Se representa el escenario administrativo de CU02, la consulta administrativa de CU03, el borrador de CU06, la confirmación de cita de CU07 y la indicación médica de CU21. Las actividades de CU21 también muestran la revisión posterior del bioquímico. Las vistas de caso de uso conservan otros actores del contrato; su asociación no concede todas las operaciones internas.

La bitácora registra acciones mediante auditoría transaccional; su consulta no dibuja todos los disparadores. La cita conserva el prefiltro histórico; el borrador no reserva cupo. Consentimiento, extracción y madre se guardan conjuntamente. Para colecta autóloga también se requiere programa aprobado y exclusividad del receptor según las fichas.

La liberación es expresa y exclusiva del bioquímico, con ambas evaluaciones aprobadas y grupo concordante. Un resultado incompatible o una corrección invalida la liberación y exige cuarentena. Corregir requiere motivo, versión vigente y ausencia de entrega; cancela reservas incompatibles. El negocio muestra fraccionamiento antes de liberar como recorrido posible, sin imponer un orden nuevo entre los dos análisis.

Stripe confirma mediante notificación posterior e independiente del navegador: firma válida, sesión real, datos concordantes e idempotencia. Los reportes respetan permisos por dominio; finanzas es exclusiva de ADMIN. Los valores clínicos y de conservación siguen siendo los acordados para el proyecto académico.

Los modelos no acreditan pruebas ni despliegue. La matriz `matriz_casos.csv` relaciona código, ciclo, actores, precondiciones, tablas y rutas de referencia. Los informes y pruebas del proyecto determinan el estado real de implementación.

## Inserción y regeneración

Abrir `galeria.html`; usar PNG en Word o SVG para ampliar sin perder nitidez. `indice.csv` indica fuentes y secciones orientativas. Consolidado y secuencias extensas se leen mejor en páginas horizontales; mantener proporciones al insertar.

Esta entrega no modifica automáticamente el Word. Conserva las capturas reales del frontend y las guías originales. En `output/diagramas_hemovida` sustituye las imágenes anteriores y retira los generales obsoletos.

Para regenerar, ejecutar `generar_diagramas.bat` en la raíz del proyecto. Requiere Python 3.10+, Java 17+ y PlantUML 1.2026.9, cuya descarga oficial se verifica por SHA-256. No utiliza credenciales ni modifica la BD.
