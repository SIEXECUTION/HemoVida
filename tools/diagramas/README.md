# Generador PlantUML de HemoVida

Ejecutar `generar_diagramas.bat` desde la raíz, o:

```powershell
python tools/diagramas/generar_diagramas.py --descargar-plantuml
```

Genera **104 diagramas** en `output/diagramas_hemovida`, con PNG, SVG, fuentes `.puml`, galería e índices. La [guía de referencias y categorías](REFERENCIAS_METODOLOGICAS.md) detalla la notación, los escenarios y sus límites. Se copia como `LEEME.md` junto a las imágenes.

Python 3.10+ y Java 17+. No requiere paquetes pip. Descarga PlantUML 1.2026.9 de su publicación oficial y verifica SHA-256; después utiliza el JAR de `.venv/herramientas/plantuml`. Smetana evita instalar Graphviz. No se conecta a BD ni a servicios externos de renderizado.

## Archivos editables

- `casos.json`: fichas, ciclos, actores, reglas, rutas y tablas de referencia.
- `modelo.py`: entidades conceptuales, atributos, responsabilidades y escenarios.
- `notacion.py`: representación UML y diagramas generales según `Desktop/DIAGRAMAS`.
- `generar_diagramas.py`: renderizado, limpieza de obsoletos e índices.

Cuando cambie el backend, actualizar ficha y escenario; después regenerar y revisar. No existe análisis automático del código futuro. El modelo conceptual no es el esquema físico ni una transcripción de clases Python.

## Opciones

```powershell
python tools/diagramas/generar_diagramas.py --ciclo 3
python tools/diagramas/generar_diagramas.py --ciclo 2 --tipo secuencias --salida .venv/ejemplo_secuencias
python tools/diagramas/generar_diagramas.py --formatos png
python tools/diagramas/generar_diagramas.py --solo-fuentes
```

Una generación completa retira únicamente los archivos obsoletos identificados por su índice previo dentro de la salida. Los filtros preservan otros ciclos: usar otra carpeta con `--salida` para una entrega filtrada limpia. Las fuentes con igual nombre se sobrescriben; conservar las ediciones manuales en otra carpeta.

Un fallo devuelve error y conserva el índice anterior; `errores.txt` informa la causa. La matriz permite revisar dependencias y trazabilidad. La galería enlaza los formatos disponibles.

Fuentes técnicas: [descarga oficial](https://plantuml.com/download), [Smetana](https://plantuml.com/smetana02) y [relaciones y etiquetas](https://plantuml.com/class-diagram). La metodología y presentación siguen las guías del usuario.
