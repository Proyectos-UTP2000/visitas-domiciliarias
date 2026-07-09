import { apiRequest } from "../../shared/api";
import { getAccessToken } from "../auth/auth-storage";
import { API_BASE_URL } from "../../shared/config";
import type { ActorSocialRecord, ActorSocialFormState, EstadoActorSocial, ActorSocialArchivo } from "./actores-sociales-types";

const BASE_ENDPOINT = "/actores-sociales";

export function listActores(municipalidadId?: string | null): Promise<ActorSocialRecord[]> {
  const url = municipalidadId ? `${BASE_ENDPOINT}?municipalidadId=${municipalidadId}` : BASE_ENDPOINT;
  return apiRequest<ActorSocialRecord[]>(url);
}

export function getActorById(id: string): Promise<ActorSocialRecord> {
  return apiRequest<ActorSocialRecord>(`${BASE_ENDPOINT}/${id}`);
}

export function createActor(payload: ActorSocialFormState): Promise<ActorSocialRecord> {
  return apiRequest<ActorSocialRecord>(BASE_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export function updateActor(
  id: string,
  payload: {
    tipoActorSocialId: string;
    grupoTrabajoId: string;
    grupoEstablecimientoId: string | null;
    entidadId: string | null;
    email: string;
    celular: string;
    direccion: string;
    centroPobladoId: string | null;
    gradoInstruccion: string;
    inactivadoPermanentemente: boolean;
    sectoresIds: string[];
    sectoresACorregirIds: string[];
  }
): Promise<ActorSocialRecord> {
  return apiRequest<ActorSocialRecord>(`${BASE_ENDPOINT}/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function setActorActivo(id: string, activo: boolean): Promise<ActorSocialRecord> {
  return apiRequest<ActorSocialRecord>(`${BASE_ENDPOINT}/${id}/activo`, {
    method: "PATCH",
    body: { activo },
  });
}

export function setActorEstado(id: string, estado: EstadoActorSocial, observaciones?: string | null): Promise<ActorSocialRecord> {
  return apiRequest<ActorSocialRecord>(`${BASE_ENDPOINT}/${id}/estado`, {
    method: "PATCH",
    body: { estado, observaciones },
  });
}

export function archivarActor(id: string): Promise<ActorSocialRecord> {
  return apiRequest<ActorSocialRecord>(`${BASE_ENDPOINT}/${id}/archivar`, {
    method: "PATCH",
  });
}

export function deleteActor(
  id: string,
  motivoEliminacion: string
): Promise<ActorSocialRecord & { notificationMessage: string }> {
  return apiRequest<ActorSocialRecord & { notificationMessage: string }>(`${BASE_ENDPOINT}/${id}`, {
    method: "DELETE",
    body: { motivoEliminacion },
  });
}

export function listActorArchivos(actorId: string): Promise<ActorSocialArchivo[]> {
  return apiRequest<ActorSocialArchivo[]>(`${BASE_ENDPOINT}/${actorId}/archivos`);
}

export async function uploadActorArchivo(actorId: string, file: File): Promise<ActorSocialArchivo> {
  const token = getAccessToken();
  const url = `${API_BASE_URL}${BASE_ENDPOINT}/${actorId}/archivos`;
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

  return response.json() as Promise<ActorSocialArchivo>;
}

export function deleteActorArchivo(actorId: string, archivoId: string): Promise<ActorSocialArchivo> {
  return apiRequest<ActorSocialArchivo>(`${BASE_ENDPOINT}/${actorId}/archivos/${archivoId}`, {
    method: "DELETE",
  });
}

export async function downloadActorArchivo(archivoId: string, nombreArchivo: string): Promise<void> {
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
