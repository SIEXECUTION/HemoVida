"""Reenvío local de Stripe test; claves por entorno, nunca por argumentos."""

import hmac
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
EVENTS = ",".join(
    [
        "checkout.session.completed",
        "checkout.session.expired",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
    ]
)


def main():
    load_dotenv(ROOT / "backend" / ".env")
    key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    if os.getenv("STRIPE_MODE", "test") != "test" or not key.startswith("sk_test_"):
        print(
            "Este lanzador requiere STRIPE_MODE=test y una clave sk_test_ en backend/.env."
        )
        return 1
    if not secret.startswith("whsec_"):
        print("Completa STRIPE_WEBHOOK_SECRET en backend/.env antes de iniciar.")
        return 1
    portable = (
        ROOT
        / ".venv"
        / "stripe-cli"
        / "node_modules"
        / "@stripe"
        / "cli-win32-x64"
        / "bin"
        / "stripe.exe"
    )
    executable = (
        str(portable)
        if os.name == "nt" and portable.exists()
        else shutil.which("stripe")
    )
    if not executable:
        print("Falta Stripe CLI. Instalación local desde la raíz del proyecto:")
        print("npm install --prefix .venv/stripe-cli @stripe/cli@1.55.6")
        return 1
    if os.name == "nt" and Path(executable).suffix.lower() in [".cmd", ".bat"]:
        print("Usa la instalación local indicada en CICLO3_IMPLEMENTACION.md.")
        return 1
    environment = os.environ.copy()
    environment.update(
        STRIPE_API_KEY=key,
        STRIPE_DEVICE_NAME="hemovida-local",
        STRIPE_NO_AUTO_UPDATE="1",
    )
    print(
        "Stripe test: notificaciones a http://127.0.0.1:8000/api/finanzas/stripe/webhook/",
        flush=True,
    )
    print(
        "Mantén esta terminal abierta junto al backend. Ctrl+C para detener.",
        flush=True,
    )
    process = subprocess.Popen(
        [
            executable,
            "listen",
            "--events",
            EVENTS,
            "--forward-to",
            "http://127.0.0.1:8000/api/finanzas/stripe/webhook/",
        ],
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    try:
        for line in process.stdout:
            match = re.search(r"whsec_[A-Za-z0-9]+", line)
            if match and not hmac.compare_digest(match.group(0), secret):
                print(
                    "El secreto de Stripe CLI no coincide con backend/.env. Se detuvo el reenvío."
                )
                print(
                    "Consulta stripe listen --print-secret en tu terminal y actualiza solo el secreto local."
                )
                return 1
            line = re.sub(r"whsec_[A-Za-z0-9]+", "[secreto oculto]", line)
            line = re.sub(
                r"(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+", "[clave oculta]", line
            )
            print(line.rstrip(), flush=True)
        return process.wait()
    except KeyboardInterrupt:
        return 0
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    sys.exit(main())
