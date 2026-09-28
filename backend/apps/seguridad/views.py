"""
Vistas de API REST para Seguridad, Autenticación y Auditoría (CU01, CU02, CU03).
"""
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
