"""
Vistas de API REST para Seguridad, Autenticación y Auditoría (CU01, CU02, CU03)
con soporte para RBAC múltiple, Auto-registro de Posible Donador y Alta de Personal de Salud.
"""
import os
import random
from datetime import date
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from django.db.models import Q
from django.db.models.functions import ExtractHour
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.conf import settings
from django.contrib.auth.hashers import make_password

from .models import Usuario, PersonalSalud, BitacoraAuditoria, Rol, UsuarioRol, Persona
from .serializers import (
    LoginSerializer,
    AutoRegistroPosibleDonadorSerializer,
    CrearPersonalSaludSerializer,
    PersonalSaludListSerializer,
    UsuarioEstadoUpdateSerializer,
    BitacoraAuditoriaSerializer,
)
from .permissions import IsAdminRole, IsHealthStaffRole
from .utils import get_client_ip, registrar_auditoria
from .validators import validate_password_complexity

# ============================================================================
# [CU01] Autenticar Usuario e Iniciar Sesión (Selector de Perfiles)
# ============================================================================
class LoginView(APIView):
    """
    Endpoint: POST /api/auth/login/
    Autentica credenciales institucionales, verifica estado 'Activo'
    y retorna la estructura de consumo con 'rolesDisponibles' para el modal selector de perfiles.
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
            usuario = Usuario.objects.select_related('persona').prefetch_related('roles').get(idUsuario=user_id)
            ip_origen = get_client_ip(request)
            primer_rol = usuario.roles.first()
            rol_nombre = primer_rol.nombreRol if primer_rol else 'Posible Donador'
            registrar_auditoria(
                usuario=usuario,
                accion='Inicio de Sesión Exitoso',
                tabla='Usuario',
                id_registro=user_id,
                ip_origen=ip_origen,
                rol_activo=rol_nombre
            )
        except Exception as e:
            print(f"[WARN AUDITORIA LOGIN]: {e}")

        return Response(data, status=status.HTTP_200_OK)


# ============================================================================
# PROCEDIMIENTO 1: Auto-Registro Público de Posible Donador (Sin Admin)
# ============================================================================
class AutoRegistroPosibleDonadorView(APIView):
    """
    Endpoint: POST /api/auth/autoregistro/
    Permite que un postulante a donante se cree una cuenta libremente.
    Nace con rol Posible Donador (POSIBLE_DONADOR), estado No Apto y sin análisis previo.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AutoRegistroPosibleDonadorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = serializer.save()
            return Response({
                "success": True,
                "message": "Registro completado con éxito como Posible Donador. Estado inicial: No Apto (Sin análisis serológico).",
                "usuario": {
                    "idUsuario": usuario.idUsuario,
                    "username": usuario.username,
                    "email": usuario.email,
                    "nombreCompleto": usuario.persona.nombreCompleto if usuario.persona else usuario.username,
                    "rol": "Posible Donador",
                    "codigoRol": "POSIBLE_DONADOR"
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": f"Error al procesar el auto-registro: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


# ============================================================================
# PROCEDIMIENTO 2: Alta de Personal de Salud (Solo Ejecutable por Administrador)
# ============================================================================
class CrearPersonalSaludView(APIView):
    """
    Endpoint: POST /api/personal/crear/
    Permite a un Administrador dar de alta cuentas para el personal operativo de salud
    (Doctor de Triaje, Personal de Colecta, Bioquímico Integral, Técnico de Logística, etc.).
    """
    permission_classes = [IsAdminRole]

    def post(self, request):
        serializer = CrearPersonalSaludSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            nuevo_usuario = serializer.create_for_admin(request.user, serializer.validated_data)
            return Response({
                "success": True,
                "message": "Personal de salud registrado y acreditado satisfactoriamente.",
                "usuario": {
                    "idUsuario": nuevo_usuario.idUsuario,
                    "username": nuevo_usuario.username,
                    "email": nuevo_usuario.email,
                    "cargo": nuevo_usuario.persona.personal_salud.cargo if hasattr(nuevo_usuario.persona, 'personal_salud') else '',
                    "registroProfesional": nuevo_usuario.persona.personal_salud.registroProfesional if hasattr(nuevo_usuario.persona, 'personal_salud') else '',
                    "roles": [r.codigoRol for r in nuevo_usuario.roles.all()]
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": f"Error al crear personal de salud: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


# ============================================================================
# [CU02] Matriz de Personal de Salud Clasificados por Rol Institucional
# ============================================================================
class PersonalSaludListView(APIView):
    """
    Endpoint: GET /api/personal/
    Replicación de la Matriz de personal de salud clasificados por rol institucional.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        personal_qs = PersonalSalud.objects.select_related(
            'persona', 
            'persona__usuario'
        ).prefetch_related('persona__usuario__roles').all()

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
            ip_origen=ip_origen,
            rol_activo='Administrador'
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
    - ?q=TEXT
    - ?fecha_inicio=YYYY-MM-DD
    - ?fecha_fin=YYYY-MM-DD
    - ?id_usuario=INT
    - ?tabla_afectada=STR
    - ?rol_activo=STR
    - ?fuera_turno=true
    """
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = BitacoraAuditoria.objects.select_related(
            'usuario',
            'usuario__persona'
        ).prefetch_related('usuario__roles').all()

        # Filtro especial: Operaciones fuera del turno central 19:00 - 07:00
        fuera_turno = request.query_params.get('fuera_turno', '').lower() in ('true', '1')
        if fuera_turno:
            roles_lab = ['BIOQ_INTEGRAL', 'Bioquímico(a) Integral', 'Bioquímico Serólogo', 'TEC_LOGISTICA']
            queryset = queryset.filter(
                Q(rolActivo__in=roles_lab) | Q(usuario__roles__codigoRol__in=roles_lab)
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

        # Filtro por rol activo
        rol_activo_param = request.query_params.get('rol_activo') or request.query_params.get('rolActivo')
        if rol_activo_param and rol_activo_param.lower() != 'all':
            queryset = queryset.filter(rolActivo__icontains=rol_activo_param)

        # Filtro por tabla afectada
        tabla_afectada = request.query_params.get('tabla_afectada')
        if tabla_afectada and tabla_afectada.lower() != 'all':
            tablas = [t.strip() for t in tabla_afectada.split(',') if t.strip()]
            if len(tablas) == 1:
                queryset = queryset.filter(tablaAfectada__iexact=tablas[0])
            else:
                queryset = queryset.filter(tablaAfectada__in=tablas)

        # Búsqueda textual amplia (?q=)
        query_text = request.query_params.get('q', '').strip()
        if query_text:
            queryset = queryset.filter(
                Q(accionRealizada__icontains=query_text) |
                Q(tablaAfectada__icontains=query_text) |
                Q(rolActivo__icontains=query_text) |
                Q(ipOrigen__icontains=query_text) |
                Q(usuario__username__icontains=query_text) |
                Q(usuario__persona__nombres__icontains=query_text) |
                Q(usuario__persona__apellidos__icontains=query_text) |
                Q(usuario__persona__ci__icontains=query_text)
            )

        queryset = queryset.order_by('-fechaHora')

        serializer = BitacoraAuditoriaSerializer(queryset, many=True)
        return Response({
            "totalRegistros": queryset.count(),
            "esFiltroFueraTurno": fuera_turno,
            "eventos": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Endpoint: POST /api/auditoria/
        Registra un evento de auditoría forense con rolActivo.
        """
        accion = request.data.get('accion') or request.data.get('accionRealizada') or 'Operación en Plataforma'
        tabla = request.data.get('tabla') or request.data.get('tablaAfectada') or 'Usuario'
        id_reg = request.data.get('idRegistroAfectado') or request.data.get('id_registro', 0)
        id_usuario = request.data.get('idUsuario')
        rol_activo = request.data.get('rolActivo') or request.data.get('rol_activo') or request.data.get('rol', '')
        ip_origen = get_client_ip(request)

        usuario_obj = None
        if request.user and request.user.is_authenticated and isinstance(request.user, Usuario):
            usuario_obj = request.user
        elif id_usuario:
            usuario_obj = Usuario.objects.filter(idUsuario=id_usuario).first()

        try:
            id_registro_val = int(id_reg) if id_reg is not None and str(id_reg).isdigit() else 0
        except (ValueError, TypeError):
            id_registro_val = 0

        evento = registrar_auditoria(
            usuario=usuario_obj,
            accion=accion,
            tabla=tabla,
            id_registro=id_registro_val,
            ip_origen=ip_origen,
            rol_activo=rol_activo
        )

        serializer = BitacoraAuditoriaSerializer(evento)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================================================
# RECUPERACIÓN Y MODIFICACIÓN DE CONTRASEÑA
# ============================================================================
class PasswordResetRequestView(APIView):
    """
    Endpoint: POST /api/auth/recuperar-password/solicitar/
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
            </div>
        </div>
        """

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'Banco de Sangre HemoVida <seguridad@hemovida.org>'
        email_enviado = False

        # Intentos de envío vía Brevo / Resend / SMTP
        brevo_key = os.getenv('BREVO_API_KEY')
        if brevo_key:
            try:
                import urllib.request
                import json
                sender_email = os.getenv('BREVO_SENDER_EMAIL', os.getenv('DEFAULT_FROM_EMAIL', 'hemovida.bancodesangre@gmail.com'))
                brevo_payload = json.dumps({
                    "sender": {"name": "Banco de Sangre HemoVida", "email": sender_email},
                    "to": [{"email": email}],
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
                        email_enviado = True
            except Exception as e_brevo:
                print(f"[ERROR BREVO API]: {e_brevo}")

        if usuario:
            try:
                registrar_auditoria(
                    usuario=usuario,
                    accion=f"Solicitud de token de recuperación de contraseña para {email}",
                    tabla='Usuario',
                    id_registro=usuario.idUsuario,
                    ip_origen=get_client_ip(request),
                    rol_activo='Usuario'
                )
            except Exception:
                pass

        return Response({
            "success": True,
            "message": f"Se ha enviado un código de verificación de 6 dígitos al correo {email}.",
            "email": email,
            "email_enviado": email_enviado
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    Endpoint: POST /api/auth/recuperar-password/confirmar/
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

        usuario = Usuario.objects.filter(email__iexact=email).first()
        if usuario:
            usuario.passwordHash = make_password(new_password)
            usuario.save(update_fields=['passwordHash'])
        else:
            return Response({"detail": "Usuario no encontrado para el correo indicado."}, status=status.HTTP_404_NOT_FOUND)

        cache.delete(cache_key)

        try:
            registrar_auditoria(
                usuario=usuario,
                accion=f"Restablecimiento exitoso de contraseña mediante token para {usuario.username}",
                tabla='Usuario',
                id_registro=usuario.idUsuario,
                ip_origen=get_client_ip(request),
                rol_activo='Usuario'
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
        rol_activo = request.data.get('rolActivo', 'Usuario')

        if not email or not new_password:
            return Response(
                {"detail": "Debe especificar el email y la nueva contraseña."},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = Usuario.objects.prefetch_related('roles').filter(email__iexact=email).first()
        if not usuario:
            uname = email.split('@')[0]
            usuario = Usuario.objects.prefetch_related('roles').filter(username__iexact=uname).first()

        if not usuario:
            # Buscar si existe persona asociada al email, carnet o CI
            uname = email.split('@')[0]
            persona = Persona.objects.filter(Q(ci__iexact=uname) | Q(ci__iexact=email)).first()
            if not persona:
                from apps.donantes.models import Donante
                donante = Donante.objects.select_related('persona').filter(
                    Q(carnetDigitalCodigo__iexact=uname) | Q(persona__ci__iexact=uname)
                ).first()
                if donante:
                    persona = donante.persona

            if persona:
                rol_don = Rol.objects.filter(codigoRol='DONANTE').first() or Rol.objects.filter(codigoRol='POSIBLE_DONADOR').first()
                usuario = Usuario.objects.create(
                    persona=persona,
                    username=uname[:50],
                    email=email,
                    passwordHash=make_password(new_password),
                    estado='Activo'
                )
                if rol_don:
                    UsuarioRol.objects.create(usuario=usuario, rol=rol_don)

                try:
                    registrar_auditoria(
                        usuario=usuario,
                        accion=f"Creación y asignación de contraseña para donante {usuario.username}",
                        tabla='Usuario',
                        id_registro=usuario.idUsuario,
                        ip_origen=get_client_ip(request),
                        rol_activo='Donante'
                    )
                except Exception:
                    pass
                return Response({
                    "success": True,
                    "message": "Contraseña modificada y usuario activado satisfactoriamente."
                }, status=status.HTTP_200_OK)
            else:
                return Response({"detail": "Usuario no encontrado en la base de datos."}, status=status.HTTP_404_NOT_FOUND)

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
                ip_origen=get_client_ip(request),
                rol_activo=rol_activo
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "message": "Contraseña modificada satisfactoriamente."
        }, status=status.HTTP_200_OK)
