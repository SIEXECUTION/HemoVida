# 🩸 HemoVida - Sistema de Gestión para Banco de Sangre

> Plataforma modular integral para la gestión de donantes, hemocomponentes, auditoría forense y trazabilidad transfusional.
> Desarrollado con **Python 3.12**, **Django 5**, **Django REST Framework (DRF)**, **PostgreSQL 18** y **React 19 + Vite**.

---

## 🏛️ Arquitectura del Sistema

```text
HemoVida-Banco-De-Sangre/
├── backend/                  # API REST modular en Django 5 + DRF
│   ├── apps/
│   │   ├── seguridad/        # CU01, CU02, CU03: Auth JWT, Roles RBAC, Auditoría Forense
│   │   ├── donantes/         # CU05: Donantes, Carnet Digital, Cálculo Biológico
│   │   └── inventario/       # CU04: Parámetros de Stock, Hemocomponentes, Alertas Críticas
│   ├── hemovida_project/     # Configuración central (Settings, URLs, WSGI)
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # Aplicación Web React 19 + Tailwind CSS + Vite
│   ├── src/                  # Componentes (DigitalCardModal, LoginModal, etc.)
│   ├── package.json
│   └── vite.config.ts        # Configurado con Proxy hacia el backend (:8000)
├── database/                 # Scripts SQL para PostgreSQL 18
│   ├── 00_hemovida_master.sql # Script maestro: Tablas + Triggers + SP + Inserts
│   ├── 01_tablas_e_indices.sql
│   ├── 02_triggers.sql
│   ├── 03_procedimientos_almacenados.sql
│   └── 04_datos_iniciales.sql
├── iniciar_backend.bat       # Lanzador rápido en 1 clic para Windows
├── iniciar_frontend.bat      # Lanzador rápido en 1 clic para Windows
└── README.md
```

---

## 📋 Implementación de los 5 Casos de Uso (CU01 - CU05)

### [CU01] Autenticar Usuario e Iniciar Sesión
- **Endpoint:** `POST /api/auth/login/`
- **Permisos:** Público (`AllowAny`)
- **Lógica de Negocio:**
  - Valida credenciales contra `Usuario` (soporta hashes `argon2id`, `pbkdf2` y texto plano validado).
  - Bloquea cuentas cuyo `estado` sea diferente de `'Activo'`.
  - Emite tokens JWT (`access` de 60 min y `refresh` de 24 hrs) con claims institucionales.
  - Registra automáticamente el acceso exitoso en `BitacoraAuditoria` con la IP real del cliente.

### [CU02] Gestionar Cuentas de Personal y Roles RBAC
- **Endpoints:**
  - `POST /api/usuarios/registrar/`: Creación de cuenta protegida por rol Administrador. Aplica `SecurePasswordValidator` antes de persistir y audita el alta.
  - `GET /api/personal/`: **Consulta C4 / Consulta 6:** Matriz de usuarios del personal con cargo, rol institucional y registro profesional.
  - `PATCH /api/usuarios/{id}/estado/`: Cambio de estado (`Activo`, `Inactivo`, `Bloqueado`) auditado en bitácora.

### [CU03] Consultar y Auditar Bitácora de Eventos Forenses
- **Endpoint:** `GET /api/auditoria/`
- **Filtros:** `?fecha_inicio=YYYY-MM-DD`, `?fecha_fin=YYYY-MM-DD`, `?id_usuario=INT`, `?tabla_afectada=STR`.
- **Filtro Forense Especial:** `?fuera_turno=true`
  - Ejecuta la **Subconsulta B2 / Consulta 8**: Extrae transacciones ejecutadas entre las 19:00 y las 07:00 por personal de laboratorio (`Bioquímico Serólogo`, `Técnico de Fraccionamiento y Almacén`).

### [CU04] Parametrizar Umbrales de Stock Mínimo y Alertas Críticas
- **Endpoints:**
  - `GET /api/stock/parametros/`: Listado de umbrales por componente y grupo sanguíneo ABO/Rh.
  - `PUT /api/stock/parametros/{id}/`: Actualización de umbrales con validación `stockCriticoAlerta <= stockMinimoSeguridad` y auditoría en bitácora.
  - `GET /api/stock/alertas/`: **Subconsulta B4 / Consulta 20:** Compara las bolsas en estado `'Disponible'` en `EjemplarBolsa` frente a `ParametroStockMinimo` y clasifica en `DEFICIT CRITICO` o `DEFICIT SEGURIDAD`.

### [CU05] Consultar Carnet Digital e Historial Biológico del Donante
- **Endpoint:** `GET /api/donantes/{ci}/carnet/`
- **Lógica Biológica (Consulta C1):**
  - Donantes Varones (`M`): Intervalo biológico de 90 días (`fechaHabilitacionProxima = fechaUltimaDonacion + 90 días`).
  - Donantes Mujeres (`F`): Intervalo biológico de 120 días (`fechaHabilitacionProxima = fechaUltimaDonacion + 120 días`).
  - Calcula `diasRestantesEspera = max(0, fechaHabilitacionProxima - hoy)`.
  - Habilitación: `(estadoHabilitacion == 'Apto') and (diasRestantesEspera == 0)`.
- **Acumulados Históricos (Consulta C3):** Suma total de donaciones y volumen en ml para el modal `DigitalCardModal`.

---

## 🚀 Guía Rápida de Despliegue en Local (Presentación / Exposición)

### Opción 1: Inicio Rápido en Windows (1 Clic)
1. Haz doble clic en **`iniciar_backend.bat`** (iniciará el servidor en `http://127.0.0.1:8000`).
2. Haz doble clic en **`iniciar_frontend.bat`** (iniciará la interfaz web en `http://localhost:3000`).

---

### Opción 2: Ejecución Manual Paso a Paso

#### 1. Configuración de la Base de Datos
- **PostgreSQL 18:**
  1. En pgAdmin o `psql`, crea la base de datos `Hemovida`.
  2. Ejecuta el archivo maestro [`database/00_hemovida_master.sql`](database/00_hemovida_master.sql).
  3. En `backend/.env`, configura tus credenciales:
     ```ini
     USE_SQLITE=False
     DB_NAME=Hemovida
     DB_USER=postgres
     DB_PASSWORD=tu_password
     DB_HOST=localhost
     DB_PORT=5432
     ```
- **Modo Demostración Rápido (SQLite sin Postgres):**
  - Si vas a exponer en una máquina sin PostgreSQL instalado, simplemente pon `USE_SQLITE=True` en `backend/.env` y ejecuta `python apps/seed_data.py`.

#### 2. Iniciar el Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py runserver 8000
```
API activa en: **`http://127.0.0.1:8000`**

#### 3. Iniciar el Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Aplicación web activa en: **`http://localhost:3000`**

---

## 🔑 Credenciales Institucionales de Prueba

| Rol | Usuario | Contraseña | Perfil Demostrativo |
| :--- | :--- | :--- | :--- |
| **Administrador del Sistema** | `admin.ezabala` | `HemoVida#2026!` | Acceso completo a Auditoría Forense y Stock. |
| **Donante (Carnet Digital)** | `carlos.pimentel` | `Pimentel$Dev12` | C.I. `7894561 SC` (Carnet `HV-DON-2024-0491`). |
| **Bioquímico Serólogo** | `serologia.cristhian` | `Cristhian$Vero88` | Pruebas de laboratorio y marcadores virales. |
| **Médico de Triaje** | `triaje.trinidad` | `Doctora!Triaje99` | Evaluación de aptitud física y signos vitales. |
| **Secretaría / Admisión** | `recepcion.patricia` | `Patricia@Pass123` | Recepción de postulantes y citas. |

---

## 🧪 Pruebas Unitarias Automatizadas
Para verificar la integridad de todos los endpoints y reglas de negocio:
```bash
cd backend
python manage.py test
```
**Resultado:** **18/18 pruebas superadas (OK, 0 errores, 0 fallos)** cubriendo validadores regex de contraseña, reglas biológicas de donación por sexo y reportes de stock.
