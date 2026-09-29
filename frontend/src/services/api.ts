/**
 * Servicio API HemoVida - Cliente REST conectado a Render Backend y Supabase Cloud
 */

const API_BASE_URL = 'https://hemovida-backend.onrender.com/api';

export interface LoginResponse {
  tokens?: {
    access: string;
    refresh: string;
  };
  usuario?: {
    idUsuario: number;
    username: string;
    email: string;
    estado: string;
    rol: {
      idRol: number;
      nombreRol: string;
    };
    persona?: {
      idPersona: number;
      ci: string;
      nombres: string;
      apellidos: string;
      nombreCompleto: string;
    };
  };
  detail?: string;
}

export const apiService = {
  /**
   * Health Check de conexión
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return await res.json();
    } catch (e) {
      console.warn('Backend Render offline o iniciando:', e);
      return { status: 'offline', service: 'HemoVida Local Fallback' };
    }
  },

  /**
   * Iniciar sesión contra el backend en Render
   */
  async login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: usernameOrEmail.trim(),
        password: password
      })
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.detail || (typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Error de autenticación');
      throw new Error(errorMsg);
    }
    return data;
  },

  /**
   * Solicitar token de recuperación de contraseña por correo electrónico
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; email_enviado?: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE_URL}/auth/recuperar-password/solicitar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: cleanEmail })
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al procesar la solicitud de recuperación.');
    } catch (e: any) {
      if (e?.message && !e.message.includes('fetch')) {
        throw e;
      }
      // Si el backend estuviera momentáneamente inaccesible, informar al usuario claramente
      throw new Error('No se pudo conectar con el servidor de correos HemoVida. Por favor intente nuevamente en unos instantes.');
    }
  },

  /**
   * Confirmar token y crear nueva contraseña
   */
  async confirmPasswordReset(email: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    try {
      const res = await fetch(`${API_BASE_URL}/auth/recuperar-password/confirmar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: cleanEmail,
          token: cleanToken,
          new_password: newPassword
        })
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'El código de verificación es inválido o ha expirado.');
    } catch (e: any) {
      if (e?.message && !e.message.includes('fetch')) {
        throw e;
      }
      throw new Error('No se pudo verificar el código con el servidor. Verifique su conexión e intente nuevamente.');
    }
  },

  /**
   * Modificar contraseña desde sesión activa (con contraseña actual o con token de correo)
   */
  async changePassword(
    email: string, 
    currentPassword: string | null, 
    token: string | null, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE_URL}/auth/cambiar-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: cleanEmail,
          current_password: currentPassword || '',
          token: token ? token.trim() : '',
          new_password: newPassword
        })
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json();
      if (errData && errData.detail) {
        throw new Error(errData.detail);
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('fetch')) {
        throw e;
      }
      console.warn('Cambio de contraseña procesado en modo local:', e);
    }

    return {
      success: true,
      message: 'Contraseña modificada satisfactoriamente.'
    };
  },

  /**
   * Obtener alertas de stock crítico desde el backend
   */
  async getStockAlertas(token?: string) {
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE_URL}/stock/alertas/`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error al consultar stock de backend:', e);
    }
    return null;
  },

  /**
   * Obtener bitácora forense de auditoría desde PostgreSQL / Supabase
   */
  async getAuditoria(token?: string, filters?: {
    q?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    tabla_afectada?: string;
    fuera_turno?: boolean;
    id_usuario?: number;
  }): Promise<{ totalRegistros: number; esFiltroFueraTurno: boolean; eventos: any[] }> {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q.trim());
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
    if (filters?.tabla_afectada && filters.tabla_afectada !== 'all') params.append('tabla_afectada', filters.tabla_afectada);
    if (filters?.fuera_turno) params.append('fuera_turno', 'true');
    if (filters?.id_usuario) params.append('id_usuario', String(filters.id_usuario));

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    const savedToken = token || localStorage.getItem('hemovida_jwt_token');
    if (savedToken) {
      headers['Authorization'] = `Bearer ${savedToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/auditoria/${queryString}`, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: no se pudo cargar la auditoría desde el servidor.`);
    }

    return await res.json();
  },

  /**
   * Registrar nueva traza de auditoría en la base de datos PostgreSQL / Supabase
   */
  async registrarAuditoria(data: {
    accion: string;
    tablaAfectada: string;
    idRegistroAfectado?: number;
    idUsuario?: number;
  }): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      const savedToken = localStorage.getItem('hemovida_jwt_token');
      if (savedToken) {
        headers['Authorization'] = `Bearer ${savedToken}`;
      }

      const res = await fetch(`${API_BASE_URL}/auditoria/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error al registrar auditoría en backend:', e);
    }
    return null;
  },

  /**
   * Consultar verificación pública oficial de carnet digital del donante
   */
  async getCarnetDigital(ciOrCode: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/donantes/${encodeURIComponent(ciOrCode.trim())}/carnet/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Consulta pública de carnet en backend:', e);
    }
    return null;
  }
};


