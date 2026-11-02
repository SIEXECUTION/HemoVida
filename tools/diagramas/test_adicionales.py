"""Verifica integridad documental y reglas de cardinalidad sin conectar a BD."""
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from adicionales import catalog, classifiers, ends, relational, ROOT
from arquitectura_datos import MODULES, PACKAGE_EDGES, TABLES


class ComplementaryDiagramsTests(unittest.TestCase):
    def test_package_analysis_is_acyclic_and_covers_all_cases(self):
        visiting, done = set(), set()
        def visit(node):
            self.assertNotIn(node, visiting, 'Dependencia conceptual circular')
            if node in done:
                return
            visiting.add(node)
            for src,dst in PACKAGE_EDGES:
                if src==node:visit(dst)
            visiting.remove(node);done.add(node)
        for module in MODULES:visit(module)
        ids=[ident for name,ids in MODULES.values() for ident in ids]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertEqual(set(ids),set(range(1,16))|{21,22,23,24})

    def test_catalog_foreign_keys_resolve_to_existing_columns(self):
        tables=catalog()
        self.assertEqual(len(tables),49)
        for name,table in tables.items():
            columns={c['name'] for c in table['columns']}
            for constraint in table['constraints']:
                if constraint['kind']=='f':
                    self.assertTrue(set(constraint['columns'])<=columns)
                    target=tables[constraint['references']]
                    self.assertTrue(set(constraint['reference_columns'])<={c['name'] for c in target['columns']})
        self.assertTrue(all(set(names)<=tables.keys() for names in TABLES.values()))

    def test_nullable_and_unique_foreign_keys(self):
        fk={'columns':['parent_id']}
        table={'columns':[{'name':'parent_id','not_null':False}], 'constraints':[], 'indexes':[]}
        self.assertEqual(ends(table,fk),('0..1','0..*'))
        table['columns'][0]['not_null']=True
        self.assertEqual(ends(table,fk),('1','0..*'))
        index={'unique':True,'valid':True,'expression':False,'predicate':'active = true','columns':['parent_id']}
        table['indexes']=[index]
        self.assertEqual(ends(table,fk),('1','0..*'),'La unicidad parcial no obliga a un solo hijo histórico')
        index['predicate']=None
        self.assertEqual(ends(table,fk),('1','0..1'))
        index['columns']=['parent_id','other_id']
        self.assertEqual(ends(table,fk),('1','0..*'))

    def test_physical_diagram_contains_every_column_and_fk(self):
        tables=catalog();source=relational()
        blocks=re.findall(r'entity "([a-z_]+)" as T\d+ \{\n(.*?)\n\}',source,re.S)
        self.assertEqual(len(blocks),len(tables))
        for name,body in blocks:
            fields=re.findall(r'^\*?\s*(\w+)\s*:',body,re.M)
            self.assertEqual(set(fields),{c['name'] for c in tables[name]['columns']},name)
        count=sum(c['kind']=='f' for t in tables.values() for c in t['constraints'])
        self.assertEqual(len(re.findall(r'^T\d+ (?:\|\||\|o)--(?:o\{|o\|) T\d+',source,re.M)),count)

    def test_selected_classes_and_functions_exist(self):
        for module in MODULES:
            classes=classifiers(module)
            self.assertTrue(classes,module)
            self.assertTrue(all((ROOT/c['path']).is_file() for c in classes))

    def test_cli_scopes_and_gallery(self):
        script=ROOT/'tools/diagramas/generar_diagramas.py'
        with tempfile.TemporaryDirectory(prefix='hemovida_uml_') as tmp:
            for group,count in [('base',104),('adicionales',31),('todos',135)]:
                out=Path(tmp)/group
                result=subprocess.run([sys.executable,str(script),'--grupo',group,'--salida',str(out),'--solo-fuentes'],capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stderr)
                index=json.loads((out/'indice.json').read_text(encoding='utf-8'))
                self.assertEqual(len(index),count)
                self.assertEqual(len(list(out.rglob('*.puml'))),count)
                self.assertEqual((out/'galeria.html').read_text(encoding='utf-8').count('<article>'),count)
            result=subprocess.run([sys.executable,str(script),'--grupo','adicionales','--ciclo','2','--solo-fuentes'],capture_output=True,text=True)
            self.assertEqual(result.returncode,2)


if __name__=='__main__':
    unittest.main()
