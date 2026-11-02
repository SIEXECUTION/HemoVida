# Generador PlantUML de HemoVida

Ejecutar `generar_diagramas.bat` desde la raíz, o:

```powershell
python tools/diagramas/generar_diagramas.py --descargar-plantuml
```

Genera **135 diagramas** (104 base y 31 complementarios) en `output/diagramas_hemovida`, con PNG, SVG, fuentes `.puml`, galería e índices. La [guía de referencias y categorías](REFERENCIAS_METODOLOGICAS.md) detalla la notación, los escenarios y sus límites. Se copia como `LEEME.md` junto a las imágenes.

Python 3.10+ y Java 17+. No requiere paquetes pip. Descarga PlantUML 1.2026.9 de su publicación oficial y verifica SHA-256; después utiliza el JAR de `.venv/herramientas/plantuml`. Los diagramas base usan Smetana; las vistas complementarias de datos y componentes usan Graphviz. En esta instalación Windows, el ejecutable integrado por PlantUML pasa la prueba `-testdot`. No se conecta a BD ni a servicios externos de renderizado.

## Archivos editables

- `casos.json`: fichas, ciclos, actores, reglas, rutas y tablas de referencia.
- `modelo.py`: entidades conceptuales, atributos, responsabilidades y escenarios.
- `notacion.py`: representación UML y diagramas generales según `Desktop/DIAGRAMAS`.
- `adicionales.py` y `arquitectura_datos.py`: ocho categorías complementarias y selección de elementos reales del código.
- `catalogo_supabase.json`: instantánea de metadatos de la BD; no contiene filas de negocio.
- `generar_diagramas.py`: renderizado, limpieza de obsoletos e índices.

Cuando cambie el backend, actualizar ficha y escenario y revisar las selecciones. Las clases, firmas e importaciones complementarias se extraen del AST actual; el catálogo físico permanece fijado a la fecha de su captura. El modelo conceptual no es el esquema físico ni una transcripción de clases Python.

Los nuevos diagramas se describen en [DIAGRAMAS_COMPLEMENTARIOS.md](DIAGRAMAS_COMPLEMENTARIOS.md). `generar_demas_diagramas.bat` genera solamente esos 31 en una carpeta aparte. La regeneración normal no se conecta a Supabase.

Validación del catálogo, cardinalidades, cobertura de casos, DAG y filtros: `python tools/diagramas/test_adicionales.py` (sin BD ni Java).

## Opciones

```powershell
python tools/diagramas/generar_diagramas.py --grupo adicionales
python tools/diagramas/generar_diagramas.py --tipo relacional --salida .venv/esquemas
python tools/diagramas/generar_diagramas.py --ciclo 3
python tools/diagramas/generar_diagramas.py --ciclo 2 --tipo secuencias --salida .venv/ejemplo_secuencias
python tools/diagramas/generar_diagramas.py --formatos png
python tools/diagramas/generar_diagramas.py --solo-fuentes
```

Una generación completa retira únicamente los archivos obsoletos identificados por su índice previo dentro de la salida. Los filtros preservan otros ciclos: usar otra carpeta con `--salida` para una entrega filtrada limpia. Las fuentes con igual nombre se sobrescriben; conservar las ediciones manuales en otra carpeta.

Un fallo devuelve error y conserva el índice anterior; `errores.txt` informa la causa. La matriz permite revisar dependencias y trazabilidad. La galería enlaza los formatos disponibles.

Fuentes técnicas: [descarga oficial](https://plantuml.com/download), [Smetana](https://plantuml.com/smetana02) y [relaciones y etiquetas](https://plantuml.com/class-diagram). La metodología y presentación siguen las guías del usuario.
