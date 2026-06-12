import { apiRequest } from "../../shared/api";
import type {
  GrupoEstablecimientoRecord,
  GrupoTrabajoRecord,
  MiembroGrupoRecord,
} from "./grupos-types";

const BASE_ENDPOINT = "/grupos-trabajo";

export function listGrupos(): Promise<GrupoTrabajoRecord[]> {
  return apiRequest<GrupoTrabajoRecord[]>(BASE_ENDPOINT);
}

export function createGrupo(
  payload: Omit<GrupoTrabajoRecord, "id" | "estado" | "activo" | "archivado">,
): Promise<GrupoTrabajoRecord> {
  return apiRequest<GrupoTrabajoRecord>(BASE_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export function createEstablecimiento(
  grupoId: string,
  payload: { nombre: string; codigo?: string | null; direccion?: string | null },
): Promise<GrupoEstablecimientoRecord> {
  return apiRequest<GrupoEstablecimientoRecord>(
    `${BASE_ENDPOINT}/${grupoId}/establecimientos`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function createMiembro(
  grupoId: string,
  payload: {
    grupoEstablecimientoId?: string | null;
    cargoMiembroGrupoId: string;
    dni: string;
    nombres: string;
    apellidos: string;
    celular?: string | null;
    email?: string | null;
  },
): Promise<MiembroGrupoRecord> {
  return apiRequest<MiembroGrupoRecord>(
    `${BASE_ENDPOINT}/${grupoId}/miembros`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function updateMiembroContacto(
  grupoId: string,
  miembroId: string,
  payload: {
    grupoEstablecimientoId?: string | null;
    celular?: string | null;
    email?: string | null;
  },
): Promise<MiembroGrupoRecord> {
  return apiRequest<MiembroGrupoRecord>(
    `${BASE_ENDPOINT}/${grupoId}/miembros/${miembroId}/contacto`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export function setMiembroActivo(
  grupoId: string,
  miembroId: string,
  activo: boolean,
): Promise<MiembroGrupoRecord> {
  return apiRequest<MiembroGrupoRecord>(
    `${BASE_ENDPOINT}/${grupoId}/miembros/${miembroId}/activo`,
    {
      method: "PATCH",
      body: { activo },
    },
  );
}
