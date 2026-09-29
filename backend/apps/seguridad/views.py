"""
Vistas de API REST para Seguridad, Autenticación y Auditoría (CU01, CU02, CU03).
"""
import os
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from django.db.models import Q
from django.db.models.functions import ExtractHour
from django.shortcuts import get_object_or_404

from .models import Usuario, PersonalSalud, BitacoraAuditoria, Rol
from .serializers import (
    LoginSerializer,
    UsuarioRegistrarSerializer,
    PersonalSaludListSerializer,
    UsuarioEstadoUpdateSerializer,
    BitacoraAuditoriaSerializer,
)
from .permissions import IsAdminRole
from .utils import get_client_ip, registrar_auditoria

# ============================================================================
# [CU01] Autenticar Usuario e Iniciar Sesión
# ============================================================================
class LoginView(APIView):
    """
    Endpoint: POST /api/auth/login/
    Autentica credenciales institucionales, verifica estado 'Activo'
    y registra automáticamente el acceso en BitacoraAuditoria.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        usuario_info = data['usuario']
        user_id = usuario_info['idUsuario']

        # Auditoría automática del acceso exitoso
        try:
            usuario = Usuario.objects.get(idUsuario=user_id)
            ip_origen = get_client_ip(request)
            registrar_auditoria(
                usuario=usuario,
                accion='Inicio de Sesión Exitoso',
                tabla='Usuario',
                id_registro=user_id,
                ip_origen=ip_origen
            )
        except Exception:
            # No bloquea el login si falla la auditoría externa
            pass

        return Response(data, status=status.HTTP_200_OK)


# ============================================================================
# [CU02] Gestionar Cuentas de Personal y Roles RBAC
# ============================================================================
class UsuarioRegistrarView(APIView):
    """
    Endpoint: POST /api/usuarios/registrar/
    Crea una nueva cuenta de usuario aplicando la política de contraseña segura.
    Requiere rol de Administrador y audita la acción.
    """
    permission_classes = [IsAdminRole]

    @transaction.atomic
    def post(self, request):
        serializer = UsuarioRegistrarSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        usuario = serializer.save()

        # Registro en Bitácora de Auditoría
        ip_origen = get_client_ip(request)
        registrar_auditoria(
            usuario=request.user,
            accion=f"Alta de usuario institucional: {usuario.username} con rol {usuario.rol.nombreRol}",
            tabla='Usuario',
            id_registro=usuario.idUsuario,
            ip_origen=ip_origen
        )

        return Response({
            "message": "Usuario creado satisfactoriamente cumpliendo las directivas de seguridad.",
            "usuario": {
                "idUsuario": usuario.idUsuario,
                "username": usuario.username,
                "email": usuario.email,
                "rol": usuario.rol.nombreRol,
                "estado": usuario.estado
            }
        }, status=status.HTTP_201_CREATED)


class PersonalSaludListView(APIView):
    """
    Endpoint: GET /api/personal/
    Replicación de la Consulta C4 / Consulta 6:
    Matriz de usuarios del personal de salud clasificados por rol institucional.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        # Consulta C4: Personal con cuenta de usuario y rol institucional
        personal_qs = PersonalSalud.objects.select_related(
            'persona', 
            'persona__usuario', 
            'persona__usuario__rol'
        ).all()

        serializer = PersonalSaludListSerializer(personal_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UsuarioEstadoUpdateView(APIView):
    """
    Endpoint: PATCH /api/usuarios/<id>/estado/
    Permite a un Administrador activar, suspender o bloquear a un usuario.
    """
    permission_classes = [IsAdminRole]

    @transaction.atomic
    def patch(self, request, pk):
        usuario = get_object_or_404(Usuario, idUsuario=pk)
        serializer = UsuarioEstadoUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        estado_anterior = usuario.estado
        nuevo_estado = serializer.validated_data['estado']

        usuario.estado = nuevo_estado
        usuario.save(update_fields=['estado'])

        # Registro en Bitácora de Auditoría
        ip_origen = get_client_ip(request)
        registrar_auditoria(
            usuario=request.user,
            accion=f"Actualización de estado de usuario '{usuario.username}': {estado_anterior} -> {nuevo_estado}",
            tabla='Usuario',
            id_registro=usuario.idUsuario,
            ip_origen=ip_origen
        )

        return Response({
            "message": f"Estado del usuario '{usuario.username}' actualizado a '{nuevo_estado}' con éxito.",
            "idUsuario": usuario.idUsuario,
            "username": usuario.username,
            "estado": usuario.estado
        }, status=status.HTTP_200_OK)


# ============================================================================
# [CU03] Consultar y Auditar Bitácora de Eventos Forenses
# ============================================================================
class BitacoraAuditoriaListView(APIView):
    """
    Endpoint: GET /api/auditoria/
    Filtros soportados:
    - ?fecha_inicio=YYYY-MM-DD
    - ?fecha_fin=YYYY-MM-DD
    - ?id_usuario=INT
    - ?tabla_afectada=STR (Ej. EjemplarBolsa, AnalisisInmunoSerologico, BajaInventario)
    - ?fuera_turno=true (Ejecuta la Subconsulta B2 / Consulta 8: 19:00 a 07:00 en laboratorio)
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        queryset = BitacoraAuditoria.objects.select_related(
            'usuario',
            'usuario__rol',
            'usuario__persona'
        ).all()

        # Filtro especial: Subconsulta B2 (Operaciones fuera del turno central 19:00 - 07:00)
        fuera_turno = request.query_params.get('fuera_turno', '').lower() in ('true', '1')
        if fuera_turno:
            roles_laboratorio = ['Bioquímico Serólogo', 'Técnico de Fraccionamiento y Almacén']
            queryset = queryset.filter(
                usuario__rol__nombreRol__in=roles_laboratorio
            ).annotate(
                hora=ExtractHour('fechaHora')
            ).filter(
                Q(hora__lt=7) | Q(hora__gt=19)
            )

        # Filtro por rango de fechas
        fecha_inicio = request.query_params.get('fecha_inicio')
        if fecha_inicio:
            queryset = queryset.filter(fechaHora__date__gte=fecha_inicio)

        fecha_fin = request.query_params.get('fecha_fin')
        if fecha_fin:
            queryset = queryset.filter(fechaHora__date__lte=fecha_fin)

        # Filtro por usuario
        id_usuario = request.query_params.get('id_usuario')
        if id_usuario:
            queryset = queryset.filter(usuario__idUsuario=id_usuario)

        # Filtro por tabla afectada
        tabla_afectada = request.query_params.get('tabla_afectada')
        if tabla_afectada:
            tablas = [t.strip() for t in tabla_afectada.split(',') if t.strip()]
            if len(tablas) == 1:
                queryset = queryset.filter(tablaAfectada__iexact=tablas[0])
            else:
                queryset = queryset.filter(tablaAfectada__in=tablas)

        queryset = queryset.order_by('-fechaHora')

        serializer = BitacoraAuditoriaSerializer(queryset, many=True)
        return Response({
            "totalRegistros": queryset.count(),
            "esFiltroFueraTurno": fuera_turno,
            "eventos": serializer.data
        }, status=status.HTTP_200_OK)


# ============================================================================
# RECUPERACIÓN Y MODIFICACIÓN DE CONTRASEÑA CON TOKEN / CLAVE ACTUAL
# ============================================================================
import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from .validators import validate_password_complexity
from django.contrib.auth.hashers import make_password

class PasswordResetRequestView(APIView):
    """
    Endpoint: POST /api/auth/recuperar-password/solicitar/
    Genera un token de 6 dígitos válido por 15 minutos y lo envía al correo.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email or '@' not in email:
            return Response(
                {"detail": "Debe proporcionar un correo electrónico válido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = None
        try:
            usuario = Usuario.objects.filter(email__iexact=email).first()
            if not usuario:
                usuario = Usuario.objects.filter(username__iexact=email).first()
                if usuario:
                    email = usuario.email.lower()
        except Exception as e:
            print(f"[WARN DB] Error al consultar usuario en base de datos: {e}")

        nombre_saludo = usuario.username if usuario else email.split('@')[0]
        code = f"{random.randint(100000, 999999)}"
        cache_key = f"pwd_reset_{email}"
        user_id = usuario.idUsuario if usuario else None
        cache.set(cache_key, {"code": code, "user_id": user_id}, timeout=900)

        asunto = f"HemoVida - Código de Recuperación: {code}"
        mensaje_texto = (
            f"Estimado/a {nombre_saludo},\n\n"
            f"Ha solicitado restablecer su contraseña en el Banco de Sangre y Transfusión HemoVida.\n\n"
            f"Su código de verificación y confirmación de correo es:\n\n"
            f"   >> {code} <<\n\n"
            f"Este código es válido durante los próximos 15 minutos.\n"
            f"Si usted no solicitó este cambio, ignore este mensaje.\n\n"
            f"Atentamente,\n"
            f"Seguridad Institucional - Banco de Sangre HemoVida\n"
            f"Santa Cruz de la Sierra, Bolivia"
        )
        mensaje_html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #881337 0%, #e11d48 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Banco de Sangre HemoVida</h1>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #fecdd3; opacity: 0.95;">Seguridad Transfusional & Autenticación de Acceso</p>
            </div>
            <div style="padding: 32px 28px; color: #334155; line-height: 1.6;">
                <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Recuperación de Contraseña</h2>
                <p style="font-size: 14px; margin-bottom: 20px;">
                    Estimado/a <strong>{nombre_saludo}</strong>, hemos recibido una solicitud para restablecer la contraseña de su cuenta asociada a <strong>{email}</strong>.
                </p>
                <div style="background: #fff1f2; border: 2px dashed #f43f5e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                    <span style="display: block; font-size: 12px; text-transform: uppercase; font-weight: 700; color: #9f1239; letter-spacing: 1px; margin-bottom: 8px;">Su Código de Verificación</span>
                    <span style="font-family: 'Consolas', 'Monaco', monospace; font-size: 36px; font-weight: 800; color: #be123c; letter-spacing: 6px;">{code}</span>
                    <span style="display: block; font-size: 11px; color: #9f1239; margin-top: 8px;">Válido durante 15 minutos</span>
                </div>
                <p style="font-size: 13px; color: #64748b;">
                    Ingrese este código en el sistema para confirmar que esta cuenta de correo electrónico le pertenece y proceder a establecer su nueva contraseña segura.
                </p>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
                    <p style="margin: 0;">Por razones de seguridad, nunca comparta este código con nadie. Si no solicitó esta recuperación, puede ignorar este mensaje.</p>
                </div>
            </div>
            <div style="background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
                Banco de Sangre y Servicio de Transfusión HemoVida • Calle Warnes N° 271, Santa Cruz, Bolivia.
            </div>
        </div>
        """

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'Banco de Sangre HemoVida <seguridad@hemovida.org>'

        # 1. Intentar con Django Mail (con resolución IPv4 forzada)
        try:
            from django.core.mail import EmailMultiAlternatives
            msg = EmailMultiAlternatives(asunto, mensaje_texto, from_email, [email])
            msg.attach_alternative(mensaje_html, "text/html")
            msg.send(fail_silently=False)
            email_enviado = True
        except Exception as e:
            email_error_detalle = str(e)
            print(f"[ERROR EMAIL] Fallo intento primario SMTP: {e}")

        # 2. Fallback automático directo a SSL puerto 465 si falló por red/puerto
        if not email_enviado:
            smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')
            smtp_pass = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
            smtp_host = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
            if smtp_user and smtp_pass:
                try:
                    import smtplib
                    from email.mime.multipart import MIMEMultipart
                    from email.mime.text import MIMEText
                    server = smtplib.SMTP_SSL(smtp_host, 465, timeout=10)
                    server.login(smtp_user, smtp_pass)
                    
                    email_msg = MIMEMultipart('alternative')
                    email_msg['Subject'] = asunto
                    email_msg['From'] = from_email
                    email_msg['To'] = email
                    email_msg.attach(MIMEText(mensaje_texto, 'plain'))
                    email_msg.attach(MIMEText(mensaje_html, 'html'))
                    
                    server.sendmail(from_email, [email], email_msg.as_string())
                    server.quit()
                    email_enviado = True
                    email_error_detalle = None
                    print(f"[INFO EMAIL] Enviado exitosamente vía SSL puerto 465 a {email}")
                except Exception as e_ssl:
                    print(f"[ERROR EMAIL SSL 465]: {e_ssl}")
                    email_error_detalle = f"{email_error_detalle} | SSL 465: {e_ssl}"

        # 3. Fallback a Resend API vía HTTPS (Puerto 443 - Jamás bloqueado en Render)
        resend_key = os.getenv('RESEND_API_KEY')
        if not email_enviado and resend_key:
            try:
                import urllib.request
                import json
                req_data = json.dumps({
                    "from": os.getenv('RESEND_FROM', 'onboarding@resend.dev'),
                    "to": [email],
                    "subject": asunto,
                    "html": mensaje_html,
                    "text": mensaje_texto
                }).encode('utf-8')
                resend_req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=req_data,
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(resend_req, timeout=10) as res_api:
                    if res_api.status in (200, 201):
                        email_enviado = True
                        email_error_detalle = None
                        print(f"[INFO EMAIL] Enviado exitosamente vía Resend API a {email}")
            except Exception as e_resend:
                print(f"[ERROR RESEND API]: {e_resend}")

        if usuario:
            try:
                registrar_auditoria(
                    usuario=usuario,
                    accion=f"Solicitud de token de recuperación de contraseña para {email}",
                    tabla='Usuario',
                    id_registro=usuario.idUsuario,
                    ip_origen=get_client_ip(request)
                )
            except Exception:
                pass

        resp_payload = {
            "success": True,
            "message": f"Se ha enviado un código de verificación de 6 dígitos al correo {email}. Revise su bandeja de entrada (y carpeta de spam o correo no deseado).",
            "email": email,
            "email_enviado": email_enviado
        }
        if not email_enviado and email_error_detalle:
            resp_payload["advertencia_smtp"] = (
                "Para entrega externa de correo, configure las credenciales SMTP (EMAIL_HOST_USER, EMAIL_HOST_PASSWORD) en Render."
            )

        return Response(resp_payload, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    Endpoint: POST /api/auth/recuperar-password/confirmar/
    Valida el token de 6 dígitos y crea una nueva contraseña.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')

        if not email or not token or not new_password:
            return Response(
                {"detail": "Email, código de token y nueva contraseña son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cache_key = f"pwd_reset_{email}"
        cached_data = cache.get(cache_key)

        if not cached_data or cached_data.get('code') != token:
            return Response(
                {"detail": "El código de verificación es inválido o ha expirado. Por favor solicite uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password_complexity(new_password)
        except Exception as err:
            err_msg = str(err.messages if hasattr(err, 'messages') else err)
            return Response({"detail": err_msg}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = Usuario.objects.filter(email__iexact=email).first()
            if not usuario:
                # Si el usuario no existe aún en la base de datos (p.ej. donante nuevo), lo creamos
                rol_donante = Rol.objects.filter(nombreRol__icontains='donante').first() or Rol.objects.first()
                base_user = email.split('@')[0]
                username = base_user
                idx = 1
                while Usuario.objects.filter(username=username).exists():
                    username = f"{base_user}{idx}"
                    idx += 1
                usuario = Usuario.objects.create(
                    username=username,
                    email=email,
                    passwordHash=make_password(new_password),
                    rol=rol_donante,
                    estado='Activo'
                )
            else:
                usuario.passwordHash = make_password(new_password)
                usuario.save(update_fields=['passwordHash'])
        except Exception as e:
            print(f"[WARN DB] Error al actualizar contraseña en base de datos: {e}")

        cache.delete(cache_key)

        try:
            registrar_auditoria(
                usuario=usuario,
                accion=f"Restablecimiento exitoso de contraseña mediante token para {usuario.username}",
                tabla='Usuario',
                id_registro=usuario.idUsuario,
                ip_origen=get_client_ip(request)
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "message": "Su contraseña ha sido actualizada con éxito. Ya puede iniciar sesión con su nueva clave."
        }, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    """
    Endpoint: POST /api/auth/cambiar-password/
    Modifica la contraseña desde sesión activa vía contraseña actual o token de correo.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        current_password = request.data.get('current_password', '')
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')

        if not email or not new_password:
            return Response(
                {"detail": "Debe especificar el email y la nueva contraseña."},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = Usuario.objects.filter(email__iexact=email).first()
        if not usuario:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if current_password:
            if not usuario.check_password(current_password):
                return Response(
                    {"detail": "La contraseña actual ingresada es incorrecta."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif token:
            cache_key = f"pwd_reset_{email}"
            cached_data = cache.get(cache_key)
            if not cached_data or cached_data.get('code') != token:
                return Response(
                    {"detail": "El código de verificación es inválido o ha expirado."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cache.delete(cache_key)
        else:
            return Response(
                {"detail": "Debe ingresar su contraseña actual o un token válido de verificación."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password_complexity(new_password)
        except Exception as err:
            err_msg = str(err.messages if hasattr(err, 'messages') else err)
            return Response({"detail": err_msg}, status=status.HTTP_400_BAD_REQUEST)

        usuario.passwordHash = make_password(new_password)
        usuario.save(update_fields=['passwordHash'])

        try:
            metodo = "contraseña actual" if current_password else "token por correo"
            registrar_auditoria(
                usuario=usuario,
                accion=f"Cambio de contraseña exitoso ({metodo}) para {usuario.username}",
                tabla='Usuario',
                id_registro=usuario.idUsuario,
                ip_origen=get_client_ip(request)
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "message": "Contraseña modificada satisfactoriamente."
        }, status=status.HTTP_200_OK)

