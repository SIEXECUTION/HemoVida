"""Comprueba ruta, modo y secreto del webhook remoto sin crear pagos ni tocar BD.

Usa el archivo privado preparado para Render, nunca el secreto de CLI local.
No imprime claves ni cuerpos de respuestas. No modifica variables de entorno.
"""
import hashlib
import hmac
import json
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
URL = 'https://hemovida-backend.onrender.com/api/finanzas/stripe/webhook/'


def main():
    values = dotenv_values(ROOT/'.venv/stripe_render/variables_render.env')
    secret = values.get('STRIPE_WEBHOOK_SECRET','')
    if not secret.startswith('whsec_') or values.get('STRIPE_MODE') != 'test':
        print('Falta el archivo privado de configuración Render-test.')
        return 1
    # Tipo no procesable: después de verificar firma y modo, el backend lo
    # ignora sin consultar sesiones Stripe ni escribir operaciones de negocio.
    body=json.dumps({'id':'evt_hemovida_diagnostico_configuracion',
                     'type':'hemovida.webhook.diagnostic','livemode':False,
                     'data':{'object':{}}}).encode()
    stamp=str(int(time.time()))
    signature=hmac.new(secret.encode(),stamp.encode()+b'.'+body,hashlib.sha256).hexdigest()
    request=Request(URL,data=body,headers={'Content-Type':'application/json',
                   'Stripe-Signature':f't={stamp},v1={signature}'},method='POST')
    try:
        with urlopen(request,timeout=45) as response:
            data=json.load(response)
            if response.status==200 and data.get('ignorado') is True:
                print('OK: Render acepta el secreto del destino Stripe test. HTTP 200; sin crear pagos.')
                print('Pendiente prueba financiera: crear y pagar Checkout desde el frontend desplegado.')
                return 0
        print('Respuesta inesperada; revisar logs de Render.')
    except HTTPError as exc:
        print(f'PENDIENTE: HTTP {exc.code}. Revisar secreto del destino, modo test y despliegue de Render.')
    except (URLError,TimeoutError,json.JSONDecodeError):
        print('No se obtuvo respuesta válida. Render podría estar iniciando; repetir cuando esté Live.')
    return 1


if __name__=='__main__':
    sys.exit(main())
