# Diagramas complementarios PUDS / UML hasta el ciclo 3

Fecha: 2026-11-01. Rama: `codex/ciclo3-desarrollo-local`.

Se desarrollaron las ocho categorías de la guía de `Desktop/DIAGRAMAS/demas diagramas`: **31 diagramas nuevos**. La ejecución general ahora prepara **135 diagramas**, manteniendo los 104 de la edición anterior.

## Categorías y entrega

| Categoría | Nuevos diagramas |
|---|---:|
| Dominio conceptual | 1 |
| Paquetes de análisis | 1 |
| Despliegue físico | 1 |
| Arquitectura por capas | 1 |
| Clases de diseño, panorama y ocho módulos | 9 |
| Esquema relacional, completo y ocho vistas | 9 |
| Componentes principales | 1 |
| Componentes de los ocho paquetes | 8 |
| **Total** | **31** |

`generar_diagramas.bat` prepara todos; `generar_demas_diagramas.bat` prepara los complementarios. Ambas salidas ofrecen PNG, SVG, PlantUML editable, galería, índices y documentación.

- Entrega completa: `output/diagramas_hemovida/galeria.html`.
- Solo los nuevos: `output/diagramas_complementarios/galeria.html`.

## Verificación de fuentes

Se consultaron exclusivamente metadatos de `public` en Supabase mediante transacciones de solo lectura: **49 tablas, 375 columnas, 79 FK y 95 índices**. No se leyeron filas de personas, usuarios o transacciones. No se aplicaron migraciones ni se modificaron datos o variables de entorno.

El catálogo se conserva sin cadenas de conexión ni credenciales. La regeneración utiliza esa instantánea local; no vuelve a conectar a Supabase. La nulabilidad, PK, UNIQUE e índices únicos totales determinan las cardinalidades físicas. Los índices únicos parciales no se interpretan como unicidad general.

Las clases, atributos, firmas e importaciones seleccionadas se obtienen por AST de archivos reales. No se importan módulos Django para dibujar. Se conservan los campos públicos y se distinguen módulos de funciones de clases Python. No se inventan operaciones CRUD, tablas ni repositorios inexistentes. Las dependencias conceptuales de análisis son acíclicas; los componentes muestran el acoplamiento real del código, incluidas importaciones diferidas.

El esquema completo incluye tablas del circuito posterior que ya existen. Su presencia no certifica implementación de casos del ciclo 4. El modelo conceptual incorpora prefiltro, entrega de incentivos, umbrales de stock e informes, además del circuito clínico y financiero; no se confunde con el esquema físico.

## Resultados de validación local

| Comprobación | Resultado |
|---|---|
| Pruebas del generador | 6 correctas |
| Cobertura y exclusividad de los 19 casos en paquetes | Correcta |
| DAG de paquetes de análisis | Sin ciclos |
| FK hacia tablas y columnas existentes | Correctas |
| Cardinalidad nullable / UNIQUE / índice único parcial | Correcta |
| Filtros base, adicionales y todos | 104 / 31 / 135 fuentes |
| Combinación inválida adicionales + ciclo | Rechazada con mensaje claro |
| Entrega completa | 135 PNG decodificados, 135 SVG válidos, 135 fuentes concordantes |
| Entrega complementaria | 31 PNG decodificados, 31 SVG válidos, 31 fuentes concordantes |
| Esquema completo en SVG | 49 entidades, 375 columnas comprobadas y 79 enlaces FK |
| Galerías | 135 y 31 previsualizaciones, con enlaces a los formatos |
| Avisos técnicos dentro de las imágenes | Cero |
| Procedencia | SHA-256 de catálogo, generadores y archivos de implementación |

Se revisaron visualmente las ocho categorías y ejemplos por módulo. Se elevó el límite de renderizado para evitar recortes en el esquema completo. Las vistas detalladas por módulo son las apropiadas para el cuerpo del Word; el esquema completo y los panoramas funcionan como anexos SVG ampliables.

Los archivos `validacion.json` e `integridad.json` acompañan ambas entregas. Las imágenes continúan fuera de Git; se versionan los generadores, pruebas, catálogo de metadatos y documentación.

No se modificaron documentos Word, diagramas de referencia, capturas del frontend, código de negocio o despliegues. Estas pruebas validan la generación documental; no constituyen pruebas funcionales del sistema ni confirmación de un despliegue Live.
