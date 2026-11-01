# Diagramas de HemoVida hasta el ciclo 3

Desde la carpeta del proyecto ejecuta `generar_diagramas.bat`. También puedes usar:

```powershell
python tools/diagramas/generar_diagramas.py --descargar-plantuml
```

Requisitos: Python 3.10 o superior y Java 17 o superior. No requiere paquetes pip. Esta máquina se verificó con Java 21. La primera ejecución descarga PlantUML 1.2026.9 desde su publicación oficial y verifica el SHA-256 fijado en el script; las siguientes utilizan el archivo local de `.venv/herramientas/plantuml`. La generación se realiza localmente y no usa la BD, credenciales, Stripe, Brevo ni servidores de renderizado externos.

El resultado se guarda en `output/diagramas_hemovida`:

- 104 diagramas: 95 individuales, tres vistas por ciclo y seis generales.
- Por cada uno de los 19 casos: caso de uso, actividad del flujo principal, secuencia, comunicación y clases de análisis.
- PNG para insertar en Word, SVG para ampliar sin perder calidad y fuentes editables PlantUML `.puml`.
- `galeria.html` para revisar imágenes; `indice.csv` e `indice.json` para localizar archivos y secciones del documento.

Ciclo 1: CU01–CU05. Ciclo 2: CU06–CU09, CU21 y CU23. Ciclo 3: CU10–CU15, CU22 y CU24. CU12 representa consentimiento y colecta; no incluye comandos de voz.

Los generales cubren despliegue, arquitectura lógica, paquetes, dominio, estados de liberación conjunta y Stripe. Las asociaciones del dominio y las clases de análisis NO son un esquema físico de Supabase ni un diagrama exhaustivo de todas las claves foráneas. Las secuencias describen interacciones lógicas y no pretenden ser una traza exacta de llamadas Python. Los permisos se aplican por operación; asociar un actor con un caso no le concede todas sus acciones.

Las fichas y flujos de `casos.json` se prepararon a partir del Word corregido y se contrastaron con las rutas y servicios del repositorio. El generador no analiza automáticamente cambios futuros del backend: cuando cambien reglas, roles o rutas, debe actualizarse ese archivo y revisarse la nueva salida. La revisión conserva reglas académicas, liberación exclusiva BIOQ, cuarentena tras corrección, autorización de reportes y confirmación Stripe por webhook.

Esto genera diagramas nuevos. No crea capturas ficticias, fotografías, firmas, un logotipo ni evidencias de pruebas/despliegue. No modifica el Word ni reemplaza automáticamente sus espacios. Para capturas de pantallas se necesita ejecutar la aplicación y capturar la interfaz real. El Ishikawa y el esquema relacional completo no se generan con este script.

## Opciones

```powershell
# Solo diagramas del ciclo 3
python tools/diagramas/generar_diagramas.py --ciclo 3

# Solo secuencias del ciclo 2
python tools/diagramas/generar_diagramas.py --ciclo 2 --tipo secuencias

# Otra carpeta de salida
python tools/diagramas/generar_diagramas.py --salida "C:\Users\Sebas\Desktop\Diagramas HemoVida"

# Solo PNG
python tools/diagramas/generar_diagramas.py --formatos png

# Preparar fuentes sin Java ni Internet
python tools/diagramas/generar_diagramas.py --solo-fuentes
```

Los filtros generan los archivos elegidos y su índice; no borran imágenes de ejecuciones anteriores. Para una entrega filtrada limpia, usa otra carpeta con `--salida`. Se sobrescriben los archivos generados con el mismo nombre: conserva tus ediciones manuales en otra carpeta o modifica el generador. Si el renderizado falla, la ejecución devuelve error y guarda `errores.txt`.

Fuentes técnicas: [descarga oficial de PlantUML](https://plantuml.com/download) y [motor Smetana integrado en Java](https://plantuml.com/smetana02). Se utiliza Smetana para evitar una instalación adicional de Graphviz.

## Validación realizada

Se ejecutó la generación completa en esta copia del proyecto: 104 PNG decodificados correctamente, 104 SVG analizados como XML y 104 fuentes PlantUML, sin errores de sintaxis. Se revisaron visualmente ejemplos de las cinco representaciones y los recorridos de colecta, liberación y Stripe. También se comprobaron el filtro ciclo 3/secuencias (ocho casos) y el rechazo con mensaje claro cuando no existe Java.
