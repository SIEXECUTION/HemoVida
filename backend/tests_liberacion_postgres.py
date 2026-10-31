"""Pruebas contra una copia vacía del esquema real en PostgreSQL local.

Nunca se conecta a Supabase. Requiere DB local hemo_liberacion_test, puerto 55439.
"""
import os
import unittest
import threading
import time
import psycopg2
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hemovida_project.settings')
os.environ['USE_SQLITE'] = 'true'
from django.conf import settings
settings.DATABASES = {'default': {
    'ENGINE': 'django.db.backends.postgresql', 'HOST': '127.0.0.1',
    'PORT': '55439', 'NAME': 'hemo_liberacion_test', 'USER': 'hemovida_test', 'PASSWORD': '',
}}
import django
django.setup()
from django.db import connection, transaction, DatabaseError
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.seguridad.models import Usuario
from apps.laboratorio.views import AnalisisView, LiberarView, LotesView


class LiberacionPostgresTests(unittest.TestCase):
    def setUp(self):
        with connection.cursor() as c:
            c.execute("SELECT current_database()")
            assert c.fetchone()[0] == 'hemo_liberacion_test'
            c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
            tables = [r[0] for r in c.fetchall()]
            c.execute('TRUNCATE '+','.join('public."'+t+'"' for t in tables)+' RESTART IDENTITY CASCADE')
            c.execute("INSERT INTO persona(ci,nombres,apellidos,sexo,fechanacimiento) VALUES('TEST','Prueba','Local','M','1990-01-01') RETURNING idpersona")
            self.person = c.fetchone()[0]
            c.execute("INSERT INTO personalsalud(idpersona,cargo,registroprofesional) VALUES(%s,'Laboratorio','TEST')", [self.person])
            for code in ['BIOQ_INTEGRAL','POSIBLE_DONADOR','DONANTE']:
                c.execute('INSERT INTO rol(codigorol,nombrerol) VALUES(%s,%s)', [code, code])
            c.execute("INSERT INTO usuario(idpersona,username,email,passwordhash) VALUES(%s,'lab','lab@example.test','unused') RETURNING idusuario", [self.person])
            self.uid = c.fetchone()[0]
            c.execute("INSERT INTO usuariorol(idusuario,idrol) SELECT %s,idrol FROM rol WHERE codigorol='BIOQ_INTEGRAL'", [self.uid])
            c.execute("INSERT INTO gruposanguineo(grupoabo,factorrh) VALUES('O','Positivo') RETURNING idgrupo")
            self.group = c.fetchone()[0]
            c.execute("INSERT INTO extracciondonacion(idpersonadonante,idpersonalsalud,codigoextraccion,volumenextraidoml,brazoextraccion) VALUES(%s,%s,'EXT-TEST',450,'Izquierdo') RETURNING idextraccion", [self.person,self.person])
            self.ext=c.fetchone()[0]
            c.execute("INSERT INTO unidadsangretotal(idextraccion,idgrupo,codigobolsamadre,tipobolsa) VALUES(%s,%s,'MAD-TEST','Cuadruple') RETURNING idunidadmadre", [self.ext,self.group])
            self.madre=c.fetchone()[0]
            c.execute("INSERT INTO ejemplarbolsa(idunidadmadre,idgrupo,codigoejemplark,tipocomponente,volumenml,capacidadbolsaml,fechaextraccion,fechacaducidad) VALUES(%s,%s,'COMP-TEST','Concentrado de Globulos Rojos',250,350,CURRENT_DATE,CURRENT_DATE+35) RETURNING idejemplarbolsa",[self.madre,self.group])
            self.component=c.fetchone()[0]
            c.execute('DELETE FROM bitacoraauditoria')
        self.user=Usuario.objects.get(idUsuario=self.uid)
        self.factory=APIRequestFactory()
        self.sero=dict(codigoanalisis='SER-TEST',dictamenfinal='Apto', **{k:'No Reactivo' for k in ['resultadovih','resultadochagas','resultadohepatitisb','resultadohepatitisc','resultadosifilis','resultadohtlv']})
        self.hema=dict(grupoaboconfirmado='O',factorrhconfirmado='Positivo',pruebacoombsdirecta='Negativo',pruebacoombsindirecta='Negativo',rastreoanticuerposirregulares='Negativo',dictameninmunohematologico='Apto')

    def call(self, view, method='post', data=None, auth=True, **kwargs):
        request=getattr(self.factory,method)('/',data or {},format='json')
        if auth:
            force_authenticate(request,user=self.user,token={'rolActivo':'BIOQ_INTEGRAL'})
        return view.as_view()(request,madre=self.madre,**kwargs)

    def approved(self):
        a=self.call(AnalisisView,data=self.sero,tipo='serologia')
        b=self.call(AnalisisView,data=self.hema,tipo='hematologia')
        self.assertEqual((a.status_code,b.status_code),(201,201), (a.data,b.data))
        return a.data['id'],b.data['id']

    def state(self):
        with connection.cursor() as c:
            c.execute('SELECT estadobolsak FROM ejemplarbolsa WHERE idejemplarbolsa=%s',[self.component])
            return c.fetchone()[0]

    def test_requires_both_and_audits_once(self):
        self.assertEqual(self.call(LiberarView).status_code,400)
        self.assertEqual(self.call(AnalisisView,data=self.sero,tipo='serologia').status_code,201)
        self.assertEqual(self.call(LiberarView).status_code,400)
        self.assertEqual(self.state(),'En Cuarentena')
        self.assertEqual(self.call(AnalisisView,data=self.hema,tipo='hematologia').status_code,201)
        result=self.call(LiberarView)
        self.assertEqual(result.status_code,200,result.data)
        self.assertEqual(self.state(),'Disponible')
        with connection.cursor() as c:
            c.execute('SELECT count(*),count(DISTINCT idusuario) FROM bitacoraauditoria')
            self.assertEqual(c.fetchone(),(4,1)) # dos analisis, madre y componente
            c.execute('SELECT count(*) FROM bitacoraauditoria WHERE idusuario=%s AND rolactivo=%s',[self.uid,'BIOQ_INTEGRAL'])
            self.assertEqual(c.fetchone()[0],4)
        self.call(LiberarView)
        with connection.cursor() as c:
            c.execute('SELECT count(*) FROM bitacoraauditoria')
            self.assertEqual(c.fetchone()[0],4)

    def test_reactive_rejected_and_direct_write_guarded(self):
        self.sero['resultadovih']='Reactivo'
        self.assertEqual(self.call(AnalisisView,data=self.sero,tipo='serologia').status_code,400)
        with self.assertRaises(DatabaseError),transaction.atomic(),connection.cursor() as c:
            c.execute("UPDATE ejemplarbolsa SET estadobolsak='Disponible' WHERE idejemplarbolsa=%s",[self.component])
        self.assertEqual(self.state(),'En Cuarentena')

    def test_correction_quarantines_and_preserves_dispatch(self):
        sero_id,_=self.approved()
        self.call(LiberarView)
        with connection.cursor() as c:
            c.execute("INSERT INTO receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor,idgrupo) VALUES(%s,'REC-TEST','O Positivo',%s)",[self.person,self.group])
            c.execute("INSERT INTO reservasangre(idreceptor,idejemplarbolsa,fechavencimientoreserva) VALUES(%s,%s,CURRENT_DATE+2)",[self.person,self.component])
            c.execute("UPDATE ejemplarbolsa SET estadobolsak='Reservada' WHERE idejemplarbolsa=%s",[self.component])
        self.hema['dictameninmunohematologico']='Pendiente'
        with connection.cursor() as c:
            c.execute("UPDATE analisisinmunohematologico SET dictameninmunohematologico='Pendiente' WHERE idunidadmadre=%s",[self.madre])
            c.execute('SELECT estadoreserva FROM reservasangre')
            self.assertEqual(c.fetchone()[0],'Cancelada')
        self.assertEqual(self.state(),'En Cuarentena')
        with connection.cursor() as c:
            c.execute("UPDATE ejemplarbolsa SET estadobolsak='Despachada' WHERE idejemplarbolsa=%s",[self.component])
        self.sero.update(dictamenfinal='No Apto',resultadovih='Reactivo')
        result=self.call(AnalisisView,method='put',data=self.sero,tipo='serologia',analisis_id=sero_id)
        self.assertEqual(result.status_code,200,result.data)
        self.assertEqual(self.state(),'Despachada')
        with connection.cursor() as c:
            c.execute("SELECT count(*) FROM bitacoraauditoria WHERE accionrealizada LIKE 'REVISION URGENTE:%'")
            self.assertGreater(c.fetchone()[0],0)

    def test_mismatched_group_or_expired_component(self):
        self.hema['grupoaboconfirmado']='A'
        self.approved()
        self.assertEqual(self.call(LiberarView).status_code,400)
        with connection.cursor() as c:
            c.execute("UPDATE analisisinmunohematologico SET grupoaboconfirmado='O' WHERE idunidadmadre=%s",[self.madre])
            c.execute('UPDATE ejemplarbolsa SET fechacaducidad=CURRENT_DATE-1 WHERE idejemplarbolsa=%s',[self.component])
        self.assertEqual(self.call(LiberarView).status_code,409)
        self.assertEqual(self.state(),'En Cuarentena')
        with connection.cursor() as c:
            c.execute('SELECT estadoliberacion FROM unidadsangretotal WHERE idunidadmadre=%s',[self.madre])
            self.assertEqual(c.fetchone()[0],'En Cuarentena')

    def test_permissions_and_reading(self):
        self.assertIn(self.call(LiberarView,auth=False).status_code,[401,403])
        with connection.cursor() as c:
            c.execute("UPDATE rol SET codigorol='DOC_TRIAJE' WHERE codigorol='BIOQ_INTEGRAL'")
        self.assertEqual(self.call(LiberarView).status_code,403)

    def test_direct_audit_no_fabricated_user(self):
        self.approved()
        with connection.cursor() as c:
            c.execute("UPDATE unidadsangretotal SET estadoliberacion='Liberada Apta' WHERE idunidadmadre=%s",[self.madre])
            c.execute("SELECT idusuario,rolactivo,accionrealizada FROM bitacoraauditoria WHERE tablaafectada='unidadsangretotal'")
            uid,rol,action=c.fetchone()
            self.assertIsNone(uid)
            self.assertEqual(rol,'BD directa')
            self.assertIn('BD directa:',action)
            self.assertIn('CU13=',action)
            self.assertIn('CU14=',action)

    def test_correction_serializes_with_release(self):
        self.approved()
        result=[]
        started=threading.Event()
        writer=psycopg2.connect(host='127.0.0.1',port=55439,dbname='hemo_liberacion_test',user='hemovida_test')
        try:
            with writer.cursor() as c:
                c.execute("UPDATE analisisinmunohematologico SET dictameninmunohematologico='Pendiente' WHERE idunidadmadre=%s",[self.madre])
            def release_concurrently():
                from django.db import connections
                try:
                    started.set()
                    result.append(self.call(LiberarView).status_code)
                finally:
                    connections.close_all()
            thread=threading.Thread(target=release_concurrently)
            thread.start()
            self.assertTrue(started.wait(2))
            time.sleep(.2)
            self.assertEqual(result,[])
            writer.commit()
            thread.join(5)
            self.assertFalse(thread.is_alive())
            self.assertEqual(result,[400])
            self.assertEqual(self.state(),'En Cuarentena')
        finally:
            writer.close()

    def test_payment_and_discard_audited_without_sensitive_data(self):
        with connection.cursor() as c:
            c.execute("INSERT INTO receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor) VALUES(%s,'REC','O Positivo')",[self.person])
            c.execute("INSERT INTO institucionsalud(nombreinstitucion,tipoinstitucion,direccion,telefonocontacto) VALUES('Pruebas','Clinica','Local','0') RETURNING idinstitucion")
            institution=c.fetchone()[0]
            c.execute("INSERT INTO solicitudhospitalaria(idinstitucion,idreceptor,numerosolicitud,prioridadsolicitud,cantidadbolsassolicitadas) VALUES(%s,%s,'SOL-TEST','Programada',1) RETURNING idsolicitud",[institution,self.person])
            solicitud=c.fetchone()[0]
            c.execute("INSERT INTO deudafinanciera(idsolicitud,montooriginal,motivodeuda) VALUES(%s,100,'Prueba') RETURNING iddeuda",[solicitud])
            deuda=c.fetchone()[0]
            c.execute("INSERT INTO pagofinanciero(iddeuda,montopagado,metodopago,estadotransaccion,fechahorapago,observaciones) VALUES(%s,30,'Tarjeta','Confirmada',NOW(),'DATO_NO_AUDITAR')",[deuda])
            c.execute('SELECT montoabonado,saldopendiente FROM deudafinanciera WHERE iddeuda=%s',[deuda])
            self.assertEqual(tuple(map(int,c.fetchone())),(30,70))
            c.execute("INSERT INTO bajainventario(idejemplarbolsa,idpersonalsalud,motivobaja) VALUES(%s,%s,'Prueba')",[self.component,self.person])
            c.execute("SELECT tablaafectada,accionrealizada FROM bitacoraauditoria WHERE tablaafectada IN ('pagofinanciero','bajainventario')")
            events=c.fetchall()
            self.assertEqual(len(events),2)
            self.assertFalse(any('DATO_NO_AUDITAR' in action for _,action in events))


if __name__=='__main__':
    unittest.main(verbosity=2)
