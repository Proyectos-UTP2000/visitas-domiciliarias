import { apiRequest } from "../../shared/api";
import { getAccessToken } from "../auth/auth-storage";
import { API_BASE_URL } from "../../shared/config";
import type {
  EstadoGrupoTrabajo,
  GrupoEstablecimientoRecord,
  GrupoTrabajoRecord,
  GrupoTrabajoRecordWithRelations,
  GrupoTrabajoArchivoRecord,
  MiembroGrupoRecord,
} from "./grupos-types";

const BASE_ENDPOINT = "/grupos-trabajo";

export function listGrupos(municipalidadId?: string | null): Promise<GrupoTrabajoRecordWithRelations[]> {
  const url = municipalidadId ? `${BASE_ENDPOINT}?municipalidadId=${municipalidadId}` : BASE_ENDPOINT;
  return apiRequest<GrupoTrabajoRecordWithRelations[]>(url);
}

export function getGrupoById(id: string): Promise<GrupoTrabajoRecordWithRelations> {
  return apiRequest<GrupoTrabajoRecordWithRelations>(`${BASE_ENDPOINT}/${id}`);
}

export function createGrupo(
  payload: Omit<GrupoTrabajoRecord, "id" | "estado" | "activo" | "archivado" | "observaciones">,
): Promise<GrupoTrabajoRecord> {
  return apiRequest<GrupoTrabajoRecord>(BASE_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export function updateGrupo(
  id: string,
  payload: Partial<Omit<GrupoTrabajoRecord, "id" | "estado" | "activo" | "archivado" | "observaciones">>,
): Promise<GrupoTrabajoRecord> {
  return apiRequest<GrupoTrabajoRecord>(`${BASE_ENDPOINT}/${id}`, {
    method: "PUT",
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

export function updateGrupoEstado(
  id: string,
  estado: EstadoGrupoTrabajo,
  observaciones?: string | null,
): Promise<GrupoTrabajoRecord> {
  return apiRequest<GrupoTrabajoRecord>(`${BASE_ENDPOINT}/${id}/estado`, {
    method: "PATCH",
    body: { estado, observaciones },
  });
}

export function listArchivos(grupoId: string): Promise<GrupoTrabajoArchivoRecord[]> {
  return apiRequest<GrupoTrabajoArchivoRecord[]>(`${BASE_ENDPOINT}/${grupoId}/archivos`);
}

export async function uploadArchivo(grupoId: string, file: File): Promise<GrupoTrabajoArchivoRecord> {
  const token = getAccessToken();
  const url = `${API_BASE_URL}${BASE_ENDPOINT}/${grupoId}/archivos`;
  const formData = new FormData();
  formData.append("archivo", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || "No se pudo subir el archivo";
    throw new Error(message);
  }

  return response.json() as Promise<GrupoTrabajoArchivoRecord>;
}

export function deleteArchivo(grupoId: string, archivoId: string): Promise<GrupoTrabajoArchivoRecord> {
  return apiRequest<GrupoTrabajoArchivoRecord>(`${BASE_ENDPOINT}/${grupoId}/archivos/${archivoId}`, {
    method: "DELETE",
  });
}

export async function downloadArchivo(archivoId: string, nombreArchivo: string): Promise<void> {
  const token = getAccessToken();
  const url = `${API_BASE_URL}${BASE_ENDPOINT}/archivos/${archivoId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { "authorization": `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("No se pudo descargar el archivo");
  }
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export function deleteGrupo(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`${BASE_ENDPOINT}/${id}`, {
    method: "DELETE",
  });
}

export function archivarGrupo(id: string): Promise<GrupoTrabajoRecord> {
  return apiRequest<GrupoTrabajoRecord>(`${BASE_ENDPOINT}/${id}/archivar`, {
    method: "POST",
  });
}
