"""Solo la BD local aislada configurada por tests_clinica_postgres."""
import unittest
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from zoneinfo import ZoneInfo

from tests_clinica_postgres import ClinicalTests
from django.db import connection, connections
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.seguridad.models import Usuario
from apps.agenda.views import Catalogo, Turnos, Citas, Reprogramar, Cancelar, Incentivos, ConfirmarRefrigerio
from apps.clinica.views import AdmisionView, DiferimientoView
from apps.agenda.services import requirements
from apps.reportes.views import Consulta


class AgendaTests(unittest.TestCase):
    call = ClinicalTests.call
    triage = ClinicalTests.triage
    collect = ClinicalTests.collect

    def setUp(self):
        ClinicalTests.setUp(self)
        self.day = timezone.now().astimezone(ZoneInfo('America/La_Paz')).date() + timedelta(days=1)
        while self.day.weekday() >= 5:
            self.day += timedelta(days=1)
        with connection.cursor() as c:
            c.execute("INSERT INTO requisitodonacion(nombrerequisito,tiporequisito) VALUES('Requisito sintético A','General'),('Requisito sintético B','General')")
            reqs, version = requirements(c)
            c.execute("INSERT INTO usuario(idpersona,username,email,passwordhash) VALUES(%s,'paciente','paciente@example.test','unused') RETURNING idusuario", [self.pid])
            uid = c.fetchone()[0]
            c.execute("INSERT INTO usuariorol(idusuario,idrol) SELECT %s,idrol FROM rol WHERE codigorol='POSIBLE_DONADOR'", [uid])
        self.donor = Usuario.objects.get(idUsuario=uid)
        published = self.call(Turnos, {'fecha': self.day.isoformat()})
        self.assertEqual(published.status_code, 201, published.data)
        with connection.cursor() as c:
            c.execute('SELECT idturno FROM agendaturno ORDER BY inicio')
            self.slots = [r[0] for r in c.fetchall()]
        self.payload = dict(idpersona=self.pid, idturno=self.slots[0], tipoatencion='Evaluacion',
                            versioncatalogo=version, respuestas=[dict(idrequisito=r['idrequisito'], cumple=True) for r in reqs])

    def donor_request(self, view, data=None, get=False, role='POSIBLE_DONADOR', **kwargs):
        req = APIRequestFactory().get('/') if get else APIRequestFactory().post('/', data or {}, format='json')
        force_authenticate(req, user=self.donor, token={'rolActivo': role})
        return view.as_view()(req, **kwargs)

    def book(self, **changes):
        response = self.call(Citas, dict(self.payload, **changes))
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['idcita']

    def test_schedule_32_slots_lunch_weekend_and_idempotent_publication(self):
        self.assertEqual(len(self.slots), 32)
        with connection.cursor() as c:
            c.execute("SELECT extract(hour from inicio AT TIME ZONE 'America/La_Paz')::int,extract(minute from inicio AT TIME ZONE 'America/La_Paz')::int,cupo,fin-inicio FROM agendaturno ORDER BY inicio")
            slots = c.fetchall()
        self.assertEqual(slots[0][:2], (8, 0))
        self.assertEqual(slots[-1][:2], (16, 45))
        self.assertFalse(any(r[0] == 12 for r in slots))
        self.assertTrue(all(r[2] == 1 and r[3] == timedelta(minutes=15) for r in slots))
        again = self.call(Turnos, {'fecha': self.day.isoformat()})
        self.assertEqual(again.data['turnos_creados'], 0)
        weekend = self.day
        while weekend.weekday() != 5:
            weekend += timedelta(days=1)
        self.assertEqual(self.call(Turnos, {'fecha': weekend.isoformat()}).status_code, 400)
        self.assertEqual(self.call(Turnos, {'fecha': self.day.isoformat()}, role='PERS_COLECTA').status_code, 403)

    def test_booking_persists_snapshot_without_declaring_medical_aptitude(self):
        ident = self.book()
        with connection.cursor() as c:
            c.execute('SELECT count(*) FROM detallecitarequisito WHERE idcita=%s', [ident])
            self.assertEqual(c.fetchone()[0], 2)
            c.execute('SELECT catalogo,respuestas,aprobado,idusuario FROM prefiltrocita WHERE idcita=%s', [ident])
            catalog, answers, approved, actor = c.fetchone()
            self.assertEqual(len(json.loads(catalog) if isinstance(catalog, str) else catalog), 2)
            self.assertTrue(approved)
            self.assertEqual(actor, self.uid)
            c.execute("UPDATE requisitodonacion SET nombrerequisito='Nombre nuevo'")
            c.execute('SELECT catalogo FROM prefiltrocita WHERE idcita=%s', [ident])
            self.assertEqual(c.fetchone()[0], catalog)
            c.execute('SELECT estadoaptitud FROM posibledonador WHERE idpersona=%s', [self.pid])
            self.assertEqual(c.fetchone()[0], 'No Apto')
            c.execute("SELECT count(*) FROM bitacoraauditoria WHERE tablaafectada='prefiltrocita' AND idusuario=%s", [self.uid])
            self.assertEqual(c.fetchone()[0], 1)

    def test_incomplete_duplicate_unknown_and_stale_answers_rejected_atomically(self):
        a = self.payload['respuestas']
        for changes in [dict(respuestas=a[:1]), dict(respuestas=[a[0], a[0]]),
                        dict(respuestas=[a[0], dict(idrequisito=9999, cumple=True)]), dict(versioncatalogo='stale')]:
            with self.subTest(changes=changes):
                r = self.call(Citas, dict(self.payload, **changes))
                self.assertEqual(r.status_code, 400, r.data)
        with connection.cursor() as c:
            c.execute('SELECT count(*) FROM prefiltrocita')
            self.assertEqual(c.fetchone()[0], 0)

    def test_negative_prefilter_pending_no_capacity_no_medical_deferral(self):
        ident = self.book(tipoatencion='Donacion', prefiltroaprobado=True, respuestas=[dict(a, cumple=False) for a in self.payload['respuestas']])
        with connection.cursor() as c:
            c.execute('SELECT estadocita,prefiltroaprobado FROM citadonacion WHERE idcita=%s', [ident])
            self.assertEqual(c.fetchone(), ('Pendiente', False))
            c.execute('SELECT count(*) FROM diferimiento')
            self.assertEqual(c.fetchone()[0], 0)
        result = self.donor_request(Catalogo, get=True)
        self.assertEqual(result.data['turnos'][0]['disponibles'], 1)
        request = APIRequestFactory().get('/', {'fuente': 'citas', 'dimension': 'estado',
                    'desde': self.day.isoformat(), 'hasta': self.day.isoformat()})
        force_authenticate(request, user=self.user, token={'rolActivo': 'ADMIN'})
        report = Consulta.as_view()(request)
        self.assertEqual(report.status_code, 200, report.data)
        self.assertEqual(report.data['totales']['pendientes'], 1)
        self.assertEqual(report.data['totales']['programadas'], 0)
        self.assertIsNone(report.data['totales']['porcentaje_asistencia'])

    def test_negative_prefilter_can_book_evaluation_and_be_admitted_for_triage(self):
        ident = self.book(respuestas=[dict(a, cumple=False) for a in self.payload['respuestas']])
        with connection.cursor() as c:
            c.execute('SELECT estadocita,prefiltroaprobado FROM citadonacion WHERE idcita=%s', [ident])
            self.assertEqual(c.fetchone(), ('Programada', False))
            c.execute('UPDATE citadonacion SET fechahoraprogramada=CURRENT_TIMESTAMP WHERE idcita=%s', [ident])
        response = self.call(AdmisionView, dict(idcita=ident, idpersona=self.pid))
        self.assertEqual(response.status_code, 201, response.data)

    def test_donor_privacy_assigned_role_and_inactive_user(self):
        foreign = self.donor_request(Citas, dict(self.payload, idpersona=self.person))
        self.assertEqual(foreign.status_code, 403)
        own = self.donor_request(Citas, self.payload)
        self.assertEqual(own.status_code, 201, own.data)
        catalog = self.donor_request(Catalogo, get=True)
        self.assertTrue(all(a['idpersona'] == self.pid for a in catalog.data['citas']))
        self.assertIsInstance(next(a for a in catalog.data['citas'] if a['idcita'] == own.data['idcita'])['respuestas'], list)
        self.assertEqual(catalog.data['personas'], [])
        forged = self.donor_request(Catalogo, get=True, role='ADMIN')
        self.assertEqual(forged.status_code, 403)
        self.donor.estado = 'Inactivo'
        self.assertEqual(self.donor_request(Catalogo, get=True).status_code, 403)

    def test_last_place_concurrent_booking_only_one_succeeds(self):
        with connection.cursor() as c:
            c.execute("INSERT INTO persona(ci,nombres,apellidos,sexo,fechanacimiento) VALUES('OTHER','Otra','Persona','F','1990-01-01') RETURNING idpersona")
            other = c.fetchone()[0]
            c.execute('INSERT INTO posibledonador(idpersona) VALUES(%s)', [other])

        def run(pid):
            try:
                return self.call(Citas, dict(self.payload, idpersona=pid)).status_code
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(run, [self.pid, other])), [201, 400])
        with connection.cursor() as c:
            c.execute('SELECT count(*) FROM prefiltrocita')
            self.assertEqual(c.fetchone()[0], 1)

    def test_cancel_releases_capacity_and_reprogram_preserves_snapshot(self):
        ident = self.book()
        self.assertEqual(self.call(Citas, self.payload).status_code, 400)
        changed = self.call(Reprogramar, {'idturno': self.slots[1]}, ident=ident)
        self.assertEqual(changed.status_code, 201, changed.data)
        self.assertEqual(changed.data['idturno'], self.slots[1])
        self.assertEqual(self.donor_request(Cancelar, ident=ident).status_code, 200)
        with connection.cursor() as c:
            c.execute('SELECT count(*) FROM prefiltrocita WHERE idcita=%s', [ident])
            self.assertEqual(c.fetchone()[0], 1)
        self.book(idturno=self.slots[1])

    def test_changed_catalog_blocks_reprogramming(self):
        ident = self.book()
        with connection.cursor() as c:
            c.execute("UPDATE requisitodonacion SET nombrerequisito='Otro requisito'")
        response = self.call(Reprogramar, {'idturno': self.slots[1]}, ident=ident)
        self.assertEqual(response.status_code, 400, response.data)

    def test_deferral_blocks_booking_and_donation_rest_allows_evaluation(self):
        t = self.triage()
        r = self.call(DiferimientoView, dict(idpersona=self.pid, idtriaje=t,
                    tipo='Temporal', diasinhabilitacion=500, motivodetallado='Prueba de restricción'))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.call(Citas, self.payload).status_code, 400)
        with connection.cursor() as c:
            c.execute('DELETE FROM diferimiento')
            c.execute("INSERT INTO extracciondonacion(idpersonadonante,idpersonalsalud,codigoextraccion,volumenextraidoml,brazoextraccion) VALUES(%s,%s,'RECENT',450,'Izquierdo')", [self.pid, self.person])
        self.assertEqual(self.call(Citas, dict(self.payload, tipoatencion='Donacion')).status_code, 400)
        self.book(tipoatencion='Evaluacion')

    def test_underage_ordinary_appointment_rejected(self):
        with connection.cursor() as c:
            c.execute("UPDATE persona SET fechanacimiento=%s WHERE idpersona=%s", [self.day - timedelta(days=365*16), self.pid])
        self.assertEqual(self.call(Citas, self.payload).status_code, 400)

    def test_future_admission_rejected_and_today_admission_without_triage_allowed(self):
        ident = self.book()
        self.assertEqual(self.call(AdmisionView, dict(idcita=ident, idpersona=self.pid)).status_code, 400)
        with connection.cursor() as c:
            c.execute('UPDATE citadonacion SET fechahoraprogramada=CURRENT_TIMESTAMP WHERE idcita=%s', [ident])
        admitted = self.call(AdmisionView, dict(idcita=ident, idpersona=self.pid))
        self.assertEqual(admitted.status_code, 201, admitted.data)
        with connection.cursor() as c:
            c.execute('SELECT count(*) FROM triajeclinico')
            self.assertEqual(c.fetchone()[0], 0)
        self.assertEqual(self.donor_request(Cancelar, ident=ident).status_code, 400)

    def test_missing_migration_blocks_before_writes(self):
        with connection.cursor() as c:
            c.execute('ALTER TABLE prefiltrocita RENAME TO prefiltrocita_hidden')
        try:
            self.assertEqual(self.call(Citas, self.payload).status_code, 503)
        finally:
            with connection.cursor() as c:
                c.execute('ALTER TABLE prefiltrocita_hidden RENAME TO prefiltrocita')

    def test_incentive_is_real_unique_and_role_restricted(self):
        d = dict(idextraccion=self.ext, refrigerioentregado=False, tipoarticulo='Sin artículo: pendiente de entrega')
        self.assertEqual(self.donor_request(Incentivos, d).status_code, 403)
        r = self.call(Incentivos, d, role='PERS_COLECTA')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertFalse(r.data['refrigerioentregado'])
        ident = r.data['idincentivo']
        self.assertEqual(self.call(ConfirmarRefrigerio, {'confirmada': False}, ident=ident).status_code, 400)
        for _ in range(2):
            confirmed = self.call(ConfirmarRefrigerio, {'confirmada': True}, ident=ident)
            self.assertEqual(confirmed.status_code, 201, confirmed.data)
            self.assertTrue(confirmed.data['refrigerioentregado'])
        self.assertEqual(self.call(Incentivos, d).status_code, 400)
        self.assertEqual(self.call(Incentivos, dict(d, idextraccion=99999)).status_code, 404)
        with connection.cursor() as c:
            c.execute('SELECT count(*) FROM incentivoentrega')
            self.assertEqual(c.fetchone()[0], 1)
