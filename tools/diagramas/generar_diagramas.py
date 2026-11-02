#!/usr/bin/env python3
"""Genera UML de HemoVida localmente. Python 3.10+ y Java 17+; sin acceso a BD."""
from __future__ import annotations
import argparse,csv,hashlib,html,json,shutil,subprocess,sys,urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
VERSION='1.2026.9'
JAR_URL=f'https://github.com/plantuml/plantuml/releases/download/v{VERSION}/plantuml-{VERSION}.jar'
# SHA-256 se fija después de comprobar el artefacto publicado por PlantUML.
JAR_SHA256='aa4a1d06f8911c4b842beff4828dd955be431692b631a312d04c0e9fab9581de'
KINDS=('casos_uso','actividades','secuencias','comunicacion','clases_analisis')
from notacion import BUILDERS, case_name, overview, general_diagrams, diagram

def acquire_jar(path,download):
    if not path.exists():
        if not download:raise RuntimeError('Falta PlantUML. Ejecuta con --descargar-plantuml o indica --jar RUTA.')
        path.parent.mkdir(parents=True,exist_ok=True)
        partial=path.with_suffix('.part')
        print('Descargando PlantUML oficial (solo la primera vez)...',flush=True)
        try:
            with urllib.request.urlopen(JAR_URL,timeout=120) as response,partial.open('wb') as target:shutil.copyfileobj(response,target)
            if hashlib.sha256(partial.read_bytes()).hexdigest()!=JAR_SHA256:raise RuntimeError('El SHA-256 de PlantUML no coincide. No se ejecutó el archivo.')
            partial.replace(path)
        finally:
            if partial.exists():partial.unlink()
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    if actual!=JAR_SHA256:raise RuntimeError('PlantUML no coincide con la versión fijada y su SHA-256.')


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--salida',type=Path,default=ROOT/'output/diagramas_hemovida')
    ap.add_argument('--ciclo',type=int,choices=[1,2,3])
    ap.add_argument('--tipo',choices=KINDS)
    ap.add_argument('--solo-fuentes',action='store_true',help='Generar .puml sin Java ni descarga')
    ap.add_argument('--descargar-plantuml',action='store_true')
    ap.add_argument('--jar',type=Path,default=ROOT/f'.venv/herramientas/plantuml/plantuml-{VERSION}.jar')
    ap.add_argument('--java',default='java')
    ap.add_argument('--formatos',nargs='+',choices=['png','svg'],default=['png','svg'])
    args=ap.parse_args();out=args.salida.resolve();out.mkdir(parents=True,exist_ok=True)
    previous=json.loads((out/'indice.json').read_text(encoding='utf-8')) if (out/'indice.json').exists() else []
    cases=json.loads(Path(__file__).with_name('casos.json').read_text(encoding='utf-8'))
    if args.ciclo:cases=[c for c in cases if c['ciclo']==args.ciclo]
    files=[];index=[]
    def save(relative,title,source,section):
        file=out/relative;file.parent.mkdir(parents=True,exist_ok=True);file.write_text(source,encoding='utf-8');files.append(file)
        index.append({'titulo':title,'seccion_documento':section,'fuente':str(file.relative_to(out)).replace('\\','/'),'png':str(file.relative_to(out).with_suffix('.png')).replace('\\','/'),'svg':str(file.relative_to(out).with_suffix('.svg')).replace('\\','/')})
    sections={'casos_uso':'2.3','actividades':'8. Modelo de negocio / apoyo de fichas','secuencias':'5.3.1','comunicacion':'3.2','clases_analisis':'3.3'}
    for c in cases:
        for kind,builder in BUILDERS.items():
            if args.tipo and args.tipo!=kind:continue
            save(f'ciclo_{c["ciclo"]}/{kind}/CU{c["id"]:02d}_{kind}.puml',case_name(c)+' · '+kind,builder(c),sections[kind]+('.'+str(c['ciclo']) if kind!='actividades' else ''))
    if not args.tipo:
        for cycle in sorted({c['ciclo'] for c in cases}):save(f'ciclo_{cycle}/vista_ciclo_{cycle}.puml',f'Vista del ciclo {cycle}',overview(cycle,[c for c in cases if c['ciclo']==cycle]),f'2.5.{cycle}')
        if not args.ciclo:
            for name,title,content in general_diagrams(cases):save(f'generales/{name}.puml',title,diagram(title,content),'Estructura, consolidado y modelo general / de negocio')
    errors=[]
    if not args.solo_fuentes:
        if not shutil.which(args.java):raise RuntimeError('No se encontró Java. Instala Java 17+ o usa --solo-fuentes.')
        jar=args.jar.resolve();acquire_jar(jar,args.descargar_plantuml)
        for fmt in args.formatos:
            print(f'Renderizando {len(files)} diagramas en {fmt.upper()}...',flush=True)
            # Lotes cortos para no exceder el límite de argumentos de Windows.
            for start in range(0,len(files),12):
                batch=files[start:start+12]
                command=[args.java,'-Djava.awt.headless=true','-Xmx1024m','-jar',str(jar),'-charset','UTF-8','-failfast2',f'-t{fmt}']+[str(f) for f in batch]
                run=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=240)
                if run.returncode:errors.append(run.stdout+'\n'+run.stderr)
                for file in batch:
                    target=file.with_suffix('.'+fmt)
                    if not target.exists():errors.append('No se generó '+str(target))
                    elif fmt=='svg' and 'Syntax Error?' in target.read_text(encoding='utf-8',errors='replace'):errors.append('Error de sintaxis en '+str(target))
    # No publicar un índice nuevo si el renderizado falló.
    if errors:
        (out/'errores.txt').write_text('\n'.join(errors),encoding='utf-8');raise RuntimeError(f'Falló la generación. Consulta {out / "errores.txt"}')
    # Solo retirar archivos que constaban en nuestro manifiesto anterior.
    # Los filtros preservan la entrega completa y nunca eliminan otros ciclos.
    if not args.ciclo and not args.tipo:
        current={str(f.resolve()) for file in files for f in (file,file.with_suffix('.png'),file.with_suffix('.svg'))}
        for entry in previous:
            for key in ('fuente','png','svg'):
                path=(out/entry[key]).resolve()
                if out in path.parents and str(path) not in current and path.suffix in ('.puml','.png','.svg') and path.is_file():
                    path.unlink()
    (out/'indice.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
    with (out/'indice.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(index[0]));writer.writeheader();writer.writerows(index)
    with (out/'matriz_casos.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.writer(f)
        writer.writerow(['codigo','ciclo','caso_de_uso','actores','precondiciones_y_dependencias','tablas_de_referencia','ruta_de_referencia','alcance_del_modelo'])
        for c in cases:
            writer.writerow([f'CU{c["id"]:02d}',c['ciclo'],c['titulo'],', '.join(c['actores']),c['precondicion'],', '.join(c['entidades']),c['rutas'],'Documental; no certifica pruebas ni despliegue'])
    shutil.copyfile(Path(__file__).with_name('REFERENCIAS_METODOLOGICAS.md'),out/'LEEME.md')
    cards=[]
    for entry in index:
        img=entry['svg'] if 'svg' in args.formatos else entry['png']
        links=' · '.join('<a href="'+html.escape(entry[k])+'">'+name+'</a>' for k,name in [('fuente','PlantUML'),('png','PNG'),('svg','SVG')] if k=='fuente' or not args.solo_fuentes and k in args.formatos)
        cards.append('<article><h2>'+html.escape(entry['titulo'])+'</h2><p>'+html.escape(entry['seccion_documento'])+'</p>'+links+('' if args.solo_fuentes else '<a href="'+html.escape(img)+'"><img loading="lazy" src="'+html.escape(img)+'"></a>')+'</article>')
    (out/'galeria.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>Diagramas HemoVida</title><style>body{font:16px Arial;margin:30px;max-width:1500px}article{border-top:1px solid #bbb;padding:24px 0}img{display:block;max-width:100%;max-height:850px;margin:20px 0}h2{font-size:19px}</style><h1>Diagramas HemoVida hasta ciclo 3</h1><p>Modelos de análisis y diseño. No son capturas ni evidencia de pruebas o despliegue.</p>'+''.join(cards)+'</html>',encoding='utf-8')
    if not errors and (out/'errores.txt').exists():
        (out/'errores.txt').unlink()
    print(f'OK: {len(files)} diagramas. Carpeta: {out}',flush=True)
    print('Abre galeria.html para revisarlos. Fuentes editables .puml y correspondencia en indice.csv.')

if __name__=='__main__':
    try:main()
    except (RuntimeError,OSError,subprocess.TimeoutExpired) as exc:print('ERROR: '+str(exc),file=sys.stderr);sys.exit(1)
