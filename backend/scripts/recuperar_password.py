#!/usr/bin/env python
"""
Script de Recuperación y Restablecimiento de Contraseña - HemoVida
Permite generar un token de verificación seguro de 6 dígitos para un usuario registrado,
simular/enviar el correo electrónico con el token, y opcionalmente crear y asignar
una nueva contraseña que cumpla con las políticas de seguridad institucional.

Uso:
    python scripts/recuperar_password.py
    python scripts/recuperar_password.py --email usuario@hemovida.org
    python scripts/recuperar_password.py --email usuario@hemovida.org --nueva-clave "NuevaClave#2026"
"""
import os
import sys
import random
import argparse
from pathlib import Path

# Configurar entorno de Django
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hemovida_project.settings')

import django
django.setup()

from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.hashers import make_password
from apps.seguridad.models import Usuario, BitacoraAuditoria
from apps.seguridad.validators import validate_password_complexity
from apps.seguridad.utils import registrar_auditoria


def generar_token_recuperacion(email: str):
    """
    Busca al usuario, genera un código de 6 dígitos, lo guarda en caché y envía el correo.
    """
    email_clean = email.strip().lower()
    usuario = Usuario.objects.filter(email__iexact=email_clean).first()
    
    if not usuario:
        # Intentar por username
        usuario = Usuario.objects.filter(username__iexact=email_clean).first()
        if usuario:
            email_clean = usuario.email

    if not usuario:
        print(f"\n❌ Error: No se encontró ningún usuario con el correo o usuario '{email}'.")
        return None, None

    code = f"{random.randint(100000, 999999)}"
    cache_key = f"pwd_reset_{email_clean}"
    cache.set(cache_key, {"code": code, "user_id": usuario.idUsuario}, timeout=900)  # 15 minutos

    # Notificación por correo
    asunto = "HemoVida - Token de Recuperación de Contraseña"
    mensaje = (
        f"Hola {usuario.username},\n\n"
        f"Se ha generado un token de recuperación para su cuenta en HemoVida.\n"
        f"Su código de verificación es: {code}\n"
        f"Válido por 15 minutos.\n\n"
        f"Si no solicitó este cambio, comuníquese con el Administrador."
    )
    
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'seguridad@hemovida.org')
        send_mail(asunto, mensaje, from_email, [email_clean], fail_silently=True)
    except Exception as e:
        print(f"   [Aviso SMTP: {e}]")

    # Registrar en Bitácora Forense
    try:
        registrar_auditoria(
            usuario=usuario,
            accion=f"Script de CLI: Generación de token de recuperación para {email_clean}",
            tabla='Usuario',
            id_registro=usuario.idUsuario,
            ip_origen='127.0.0.1 (CLI)'
        )
    except Exception:
        pass

    return usuario, code


def restablecer_clave(usuario: Usuario, token_ingresado: str, nueva_clave: str):
    """
    Valida el token y la complejidad de la nueva clave y actualiza el usuario en la BD.
    """
    cache_key = f"pwd_reset_{usuario.email.lower()}"
    cached_data = cache.get(cache_key)

    if not cached_data or cached_data.get('code') != token_ingresado.strip():
        print("\n❌ Error: El código de verificación ingresado no es válido o ha expirado.")
        return False

    # Validar complejidad
    try:
        validate_password_complexity(nueva_clave)
    except Exception as err:
        print(f"\n❌ Error de seguridad en la contraseña: {err}")
        return False

    usuario.passwordHash = make_password(nueva_clave)
    usuario.save(update_fields=['passwordHash'])
    cache.delete(cache_key)

    # Registrar auditoría
    try:
        registrar_auditoria(
            usuario=usuario,
            accion=f"Script de CLI: Restablecimiento de contraseña exitoso para {usuario.username}",
            tabla='Usuario',
            id_registro=usuario.idUsuario,
            ip_origen='127.0.0.1 (CLI)'
        )
    except Exception:
        pass

    print(f"\n✅ ¡Éxito! La contraseña para '{usuario.username}' ({usuario.email}) ha sido actualizada correctamente.")
    return True


def main():
    parser = argparse.ArgumentParser(description="Script de Recuperación de Contraseña de HemoVida")
    parser.add_argument("--email", type=str, help="Correo electrónico del usuario")
    parser.add_argument("--token", type=str, help="Código de verificación de 6 dígitos")
    parser.add_argument("--nueva-clave", type=str, help="Nueva contraseña a establecer")
    args = parser.parse_args()

    print("=" * 65)
    print("   BANCO DE SANGRE HEMOVIDA - RECUPERACIÓN DE CONTRASEÑA")
    print("=" * 65)

    email = args.email
    if not email:
        email = input("\n📧 Ingrese el correo electrónico del usuario: ").strip()

    if not email:
        print("Operación cancelada: El correo es requerido.")
        return

    usuario, code = generar_token_recuperacion(email)
    if not usuario:
        return

    print("\n-----------------------------------------------------------------")
    print(f"👤 Usuario identificado:  {usuario.username} ({usuario.rol.nombreRol})")
    print(f"✉️  Correo de destino:     {usuario.email}")
    print(f"🔑 TOKEN GENERADO:        [ {code} ]  (Válido por 15 minutos)")
    print("-----------------------------------------------------------------")
    print(f"Se ha enviado el correo electrónico institucional a {usuario.email}.")

    # Opción para aplicar la nueva contraseña
    if args.token and args.nueva_clave:
        restablecer_clave(usuario, args.token, args.nueva_clave)
        return

    resp = input("\n¿Desea ingresar el token y cambiar la contraseña ahora mismo? (s/n): ").strip().lower()
    if resp in ('s', 'si', 'y', 'yes'):
        token_in = input(f"Ingrese el token de 6 dígitos [{code}]: ").strip() or code
        nueva_clave = input("Ingrese la nueva contraseña segura: ").strip()
        confirm_clave = input("Confirme la nueva contraseña: ").strip()

        if nueva_clave != confirm_clave:
            print("\n❌ Error: Las contraseñas no coinciden.")
            return

        restablecer_clave(usuario, token_in, nueva_clave)
    else:
        print(f"\nPuede usar el código [ {code} ] en la interfaz web de HemoVida.")


if __name__ == '__main__':
    main()
