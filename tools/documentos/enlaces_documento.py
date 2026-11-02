"""Enlaces públicos de cierre; conserva las relaciones y figuras existentes."""
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT

REPOSITORIO = 'https://github.com/SIEXECUTION/HemoVida'
FRONTEND = 'https://hemovida-banco-de-sangre.siexecution2026.workers.dev/'


def completar_enlaces(documento):
    # La tabla heredada mencionaba un QR que no contiene esta versión.
    for tabla in documento.tables:
        for fila in tabla.rows:
            for celda in fila.cells:
                for nodo in celda._tc.iter(qn('w:t')):
                    if nodo.text:
                        nodo.text = nodo.text.replace('Código QR y enlace del repositorio:', 'Enlace del repositorio:')
    # Conservar el enlace de GitHub en su tabla y añadir acceso público al final.
    ya_existe = any('Frontend de producción' == p.text.strip() for p in documento.paragraphs)
    if not ya_existe:
        titulo = documento.add_paragraph()
        titulo.add_run('Frontend de producción').bold = True
        p = documento.add_paragraph()
        enlace = OxmlElement('w:hyperlink')
        enlace.set(qn('r:id'), documento.part.relate_to(FRONTEND, RT.HYPERLINK, is_external=True))
        run = OxmlElement('w:r')
        props = OxmlElement('w:rPr')
        estilo = OxmlElement('w:rStyle')
        estilo.set(qn('w:val'), 'Hyperlink')
        props.append(estilo)
        run.append(props)
        texto = OxmlElement('w:t')
        texto.text = FRONTEND
        run.append(texto)
        enlace.append(run)
        p._p.append(enlace)


if __name__ == '__main__':
    from pathlib import Path
    from docx import Document
    destino = Path(__file__).resolve().parents[2] / 'output/documentos/HEMOVIDA_COMPLETO_CON_135_DIAGRAMAS.docx'
    doc = Document(destino)
    completar_enlaces(doc)
    doc.save(destino)
    print('Enlaces públicos incorporados.')
