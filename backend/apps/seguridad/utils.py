"""
Utilidades de seguridad y auditoría para HemoVida.
"""
from rest_framework_simplejwt.tokens import RefreshToken
from .models import BitacoraAuditoria, Usuario

def get_client_ip(request) -> str:
    """
    Obtiene la dirección IP real del cliente que realiza la petición HTTP.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip or '127.0.0.1'

def registrar_auditoria(
    usuario, 
    accion: str, 
    tabla: str, 
    id_registro: int = 0, 
    ip_origen: str = '127.0.0.1', 
    rol_activo: str = None, 
    **kwargs
) -> BitacoraAuditoria:
    """
    Registra un evento transaccional en la tabla BitacoraAuditoria con rolActivo.
    """
    raw_id = kwargs.get('idRegistroAfectado', id_registro)
    try:
        reg_id = int(raw_id) if raw_id is not None and str(raw_id).isdigit() else 0
    except (ValueError, TypeError):
        reg_id = 0

    usuario_obj = usuario if isinstance(usuario, Usuario) else None
    rol_efectivo = rol_activo
    if not rol_efectivo and usuario_obj:
        # Si no viene rol activo explícito, tomar el primer rol asignado
        primer_rol = usuario_obj.roles.first()
        rol_efectivo = primer_rol.nombreRol if primer_rol else 'Sin Rol'

    return BitacoraAuditoria.objects.create(
        usuario=usuario_obj,
        rolActivo=(rol_efectivo or 'Posible Donador')[:60],
        accionRealizada=accion[:255] if accion else 'Operación en Plataforma',
        tablaAfectada=tabla[:60] if tabla else 'Usuario',
        idRegistroAfectado=reg_id,
        ipOrigen=(ip_origen or '127.0.0.1')[:45]
    )

def generate_tokens_for_usuario(usuario: Usuario, rol_activo: str = None) -> dict:
    """
    Genera un par de tokens JWT (Access y Refresh) conteniendo los claims institucionales y lista de roles.
    """
    refresh = RefreshToken()
    # Claims en el payload del token
    refresh['user_id'] = usuario.idUsuario
    refresh['username'] = usuario.username
    refresh['email'] = usuario.email
    
    roles_list = list(usuario.roles.values('idRol', 'codigoRol', 'nombreRol'))
    refresh['roles'] = [r['codigoRol'] for r in roles_list]
    if rol_activo:
        refresh['rolActivo'] = rol_activo
    elif roles_list:
        refresh['rolActivo'] = roles_list[0]['codigoRol']

    if usuario.persona:
        refresh['ci'] = usuario.persona.ci
        refresh['nombres'] = usuario.persona.nombres
        refresh['apellidos'] = usuario.persona.apellidos
        refresh['nombreCompleto'] = usuario.persona.nombreCompleto

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def sincronizar_secuencias_seguridad():
    """
    Sincroniza preventivamente las secuencias auto-incrementales (SERIAL) de PostgreSQL
    con el valor máximo actual de las tablas Persona, Usuario y BitacoraAuditoria.
    Esto previene el error 'duplicate key value violates unique constraint' cuando
    la base de datos fue inicializada con IDs manuales (data seeding).
    """
    from django.db import connection
    if connection.vendor == 'postgresql':
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'persona_idpersona_seq') THEN
                            PERFORM setval('persona_idpersona_seq', COALESCE((SELECT MAX(idpersona) FROM persona), 1));
                        END IF;
                        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'usuario_idusuario_seq') THEN
                            PERFORM setval('usuario_idusuario_seq', COALESCE((SELECT MAX(idusuario) FROM usuario), 1));
                        END IF;
                        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bitacoraauditoria_idauditoria_seq') THEN
                            PERFORM setval('bitacoraauditoria_idauditoria_seq', COALESCE((SELECT MAX(idauditoria) FROM bitacoraauditoria), 1));
                        END IF;
                    END $$;
                """)
        except Exception:
            pass


def enviar_correo_institucional(asunto: str, mensaje_texto: str, mensaje_html: str, destinatario_email: str) -> bool:
    """
    Envía un correo institucional utilizando Brevo API (si está configurada la llave BREVO_API_KEY)
    o Django send_mail (SMTP estándar configurado en settings.py).
    """
    import os
    import json
    import urllib.request
    from django.core.mail import send_mail
    from django.conf import settings

    destinatario_email = (destinatario_email or '').strip().lower()
    if not destinatario_email or '@' not in destinatario_email:
        return False

    email_enviado = False

    # 1. Intentar envío vía Brevo API si BREVO_API_KEY existe
    brevo_key = os.getenv('BREVO_API_KEY')
    if brevo_key:
        try:
            sender_email = os.getenv('BREVO_SENDER_EMAIL', os.getenv('DEFAULT_FROM_EMAIL', 'hemovida.bancodesangre@gmail.com'))
            if '<' in sender_email and '>' in sender_email:
                sender_email = sender_email.split('<')[1].split('>')[0].strip()
            brevo_payload = json.dumps({
                "sender": {"name": "Banco de Sangre HemoVida", "email": sender_email},
                "to": [{"email": destinatario_email}],
                "subject": asunto,
                "htmlContent": mensaje_html,
                "textContent": mensaje_texto
            }).encode('utf-8')
            brevo_req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=brevo_payload,
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json"
                }
            )
            with urllib.request.urlopen(brevo_req, timeout=10) as res_brevo:
                if res_brevo.status in (200, 201):
                    return True
        except Exception as e_brevo:
            print(f"[WARN] Error al enviar correo vía Brevo API: {e_brevo}")

    # 2. Fallback: Envío vía SMTP Django standard send_mail
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'Banco de Sangre HemoVida <seguridad@hemovida.org>'
        send_mail(
            subject=asunto,
            message=mensaje_texto,
            from_email=from_email,
            recipient_list=[destinatario_email],
            html_message=mensaje_html,
            fail_silently=False
        )
        email_enviado = True
    except Exception as e_smtp:
        print(f"[WARN] Error al enviar correo vía SMTP de Django: {e_smtp}")

    return email_enviado


def enviar_correo_alta_personal_salud(
    nombres: str, 
    apellidos: str, 
    email: str, 
    username: str, 
    password: str, 
    cargo: str, 
    rol: str, 
    reg_prof: str
) -> bool:
    """
    Envía la credencial institucional y clave de acceso al personal de salud recién registrado.
    """
    nombre_completo = f"{nombres} {apellidos}".strip() or username
    asunto = f"Bienvenido/a a HemoVida - Acreditación y Credenciales de Acceso ({cargo})"

    rol_labels = {
        'DOC_TRIAJE': 'Médico de Triaje Hemoterápico',
        'PERS_COLECTA': 'Personal de Flebotomía y Colecta',
        'BIOQ_INTEGRAL': 'Bioquímico Integral de Laboratorio',
        'TEC_LOGISTICA': 'Técnico de Despacho y Cadena de Frío',
        'ADMIN': 'Administrador del Sistema Hospitalario',
        'MED_SOLICITANTE': 'Médico Solicitante Hospitalario'
    }
    nombre_rol = rol_labels.get(rol, rol)

    mensaje_texto = (
        f"Estimado/a {nombre_completo},\n\n"
        f"Le informamos que la Administración General del Banco de Sangre HemoVida ha generado y acreditado "
        f"su cuenta de acceso al Sistema Transfusional Hospitalario.\n\n"
        f"DETALLES DE SU ACREDITACIÓN:\n"
        f"----------------------------------------\n"
        f"Cargo: {cargo}\n"
        f"Rol Asignado: {nombre_rol} ({rol})\n"
        f"Registro Profesional: {reg_prof}\n\n"
        f"CREDENCIALES DE ACCESO:\n"
        f"----------------------------------------\n"
        f"Usuario / Identificador: {username}\n"
        f"Correo Institucional: {email}\n"
        f"Contraseña de Acceso: {password}\n\n"
        f"IMPORTANTE POR POLÍTICA DE SEGURIDAD:\n"
        f"Por directriz de seguridad informática institucional, le solicitamos que ingrese a la plataforma "
        f"y proceda a modificar su contraseña desde la sección 'Cambiar Contraseña' de su perfil.\n\n"
        f"Atentamente,\n"
        f"Administración y Seguridad Informática - Banco de Sangre HemoVida\n"
        f"Santa Cruz de la Sierra, Bolivia"
    )

    mensaje_html = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #881337 0%, #e11d48 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Banco de Sangre HemoVida</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #fecdd3; opacity: 0.95;">Acreditación Oficial de Personal de Salud</p>
        </div>
        <div style="padding: 32px 28px; color: #334155; line-height: 1.6;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">¡Bienvenido/a al Equipo HemoVida!</h2>
            <p style="font-size: 14px; margin-bottom: 20px;">
                Estimado/a <strong>{nombre_completo}</strong>, la Administración General del Banco de Sangre y Transfusión HemoVida le informa que ha sido acreditado/a exitosamente en el sistema con el cargo de <strong>{cargo}</strong>.
            </p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #475569; font-weight: 800; letter-spacing: 0.5px;">Acreditación Profesional</h3>
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; width: 45%;">Rol Institucional:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{nombre_rol}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Cargo Oficial:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{cargo}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Registro Profesional:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{reg_prof}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #fff1f2; border: 2px dashed #f43f5e; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #9f1239; letter-spacing: 1px; margin-bottom: 10px;">Sus Credenciales de Ingreso</span>
                <p style="margin: 6px 0; font-size: 14px; color: #881337;"><strong>Usuario:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: 700; background: #ffe4e6; padding: 2px 6px; border-radius: 4px;">{username}</span></p>
                <p style="margin: 6px 0; font-size: 14px; color: #881337;"><strong>Correo:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: 600;">{email}</span></p>
                <p style="margin: 6px 0; font-size: 14px; color: #881337;"><strong>Contraseña Inicial:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: 700; background: #ffe4e6; padding: 2px 6px; border-radius: 4px;">{password}</span></p>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600;">
                    🔒 <strong>Recomendación de Seguridad:</strong> Le aconsejamos modificar su contraseña en su primer inicio de sesión desde el perfil de usuario para cumplir con las normativas de seguridad hospitalaria.
                </p>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                Si usted no solicitó este registro o detecta inconsistencias en sus datos, comuníquese de inmediato con la administración del banco de sangre.
            </p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            Banco de Sangre y Transfusión HemoVida &copy; 2026 &bull; Santa Cruz de la Sierra, Bolivia
        </div>
    </div>
    """

    return enviar_correo_institucional(asunto, mensaje_texto, mensaje_html, email)


