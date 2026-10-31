import React, { useState } from "react";
import { Form } from "./clinical/ClinicalCircuit";
import { ApiRecords } from "./ApiRecords";
import { apiService, API_BASE_URL } from "../services/api";
import { RoleCode } from "../types";
export function AdminActions({ token }: { token: string }) {
  const [version, setVersion] = useState(0),
    [message, setMessage] = useState("");
  async function saved() {
    setVersion((v) => v + 1);
    setMessage("Cambio confirmado por el servidor.");
  }
  return (
    <div className="space-y-6">
      {message && <p role="status">{message}</p>}
      <ApiRecords
        key={"staff" + version}
        path="personal/"
        title="Personal registrado"
        token={token}
      />
      <Form
        title="Alta de personal"
        fields={[
          ...[
            "ci",
            "nombres",
            "apellidos",
            "cargo",
            "registroProfesional",
            "username",
            "email",
            "password",
            "fechaNacimiento",
          ].map((name, i) => ({
            name,
            label: [
              "Documento de identidad",
              "Nombres",
              "Apellidos",
              "Cargo",
              "Registro profesional",
              "Usuario",
              "Correo",
              "Contraseña inicial",
              "Fecha de nacimiento",
            ][i],
            type:
              name === "password"
                ? "password"
                : name === "fechaNacimiento"
                  ? "date"
                  : name === "email"
                    ? "email"
                    : "text",
          })),
          {
            name: "sexo",
            label: "Sexo",
            options: [
              ["M", "Masculino"],
              ["F", "Femenino"],
              ["O", "Otro"],
            ],
          },
          {
            name: "codigoRolAsignar",
            label: "Perfil autorizado",
            options: [
              ["DOC_TRIAJE", "Médico"],
              ["BIOQ_INTEGRAL", "Laboratorio"],
              ["PERS_COLECTA", "Colecta"],
              ["TEC_LOGISTICA", "Logística"],
              ["ADMIN", "Administración"],
            ],
          },
        ]}
        submit={async (d) => {
          await apiService.crearPersonalSalud(
            token,
            d as {
              ci: string;
              nombres: string;
              apellidos: string;
              sexo: "M" | "F" | "O";
              fechaNacimiento: string;
              cargo: string;
              registroProfesional: string;
              username: string;
              email: string;
              password: string;
              codigoRolAsignar: RoleCode;
            },
          );
          await saved();
        }}
      />
      <Form
        title="Estado y desbloqueo de cuenta"
        fields={[
          {
            name: "idUsuario",
            label: "ID de usuario registrado",
            type: "number",
          },
          {
            name: "estado",
            label: "Estado",
            options: [
              ["Activo", "Activo / desbloqueado"],
              ["Inactivo", "Inactivo"],
              ["Bloqueado", "Bloqueado"],
            ],
          },
        ]}
        submit={async (d) => {
          await apiService.updateUsuarioEstado(d.idUsuario, d.estado, token);
          await saved();
        }}
      />
      <ApiRecords
        key={"threshold" + version}
        path="stock/parametros/"
        title="Umbrales registrados"
        token={token}
      />
      <Form
        title="Actualizar umbral registrado"
        fields={[
          { name: "idParametro", label: "ID de parámetro", type: "number" },
          {
            name: "stockMinimoSeguridad",
            label: "Stock mínimo de seguridad",
            type: "number",
          },
          {
            name: "stockCriticoAlerta",
            label: "Stock crítico de alerta",
            type: "number",
          },
        ]}
        submit={async ({ idParametro, ...d }) => {
          const r = await fetch(
            `${API_BASE_URL}/stock/parametros/${idParametro}/`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(d),
            },
          );
          const b = await r.json();
          if (!r.ok) throw new Error(JSON.stringify(b));
          await saved();
        }}
      />
    </div>
  );
}
