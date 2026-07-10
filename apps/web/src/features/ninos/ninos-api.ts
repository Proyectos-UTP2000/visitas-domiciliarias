import { apiRequest } from "../../shared/api";
import type { NinoFormState, NinoRecord } from "./ninos-types";

const NINOS_ENDPOINT = "/ninos";

export function listNinos(municipalidadId?: string | null, includeArchived?: boolean): Promise<NinoRecord[]> {
  const params = new URLSearchParams();
  if (municipalidadId) params.append("municipalidadId", municipalidadId);
  if (includeArchived) params.append("archivado", "true");
  const queryString = params.toString();
  const url = queryString ? `${NINOS_ENDPOINT}?${queryString}` : NINOS_ENDPOINT;
  return apiRequest<NinoRecord[]>(url);
}

export function getNinoById(id: string): Promise<NinoRecord> {
  return apiRequest<NinoRecord>(`${NINOS_ENDPOINT}/${id}`);
}

export function createNino(payload: NinoFormState): Promise<NinoRecord> {
  return apiRequest<NinoRecord>(NINOS_ENDPOINT, {
    method: "POST",
    body: {
      ...payload,
      dni: payload.dni.trim() || null,
      cnv: payload.cnv.trim() || null,
      sectorId: payload.sectorId || null,
    },
  });
}

export function updateNino(
  id: string,
  payload: Omit<NinoFormState, "municipalidadId">
): Promise<NinoRecord> {
  return apiRequest<NinoRecord>(`${NINOS_ENDPOINT}/${id}`, {
    method: "PUT",
    body: {
      ...payload,
      dni: payload.dni?.trim() || null,
      cnv: payload.cnv?.trim() || null,
      sectorId: payload.sectorId || null,
    },
  });
}

export function setNinoActivo(
  id: string,
  activo: boolean
): Promise<NinoRecord> {
  return apiRequest<NinoRecord>(`${NINOS_ENDPOINT}/${id}/activo`, {
    method: "PATCH",
    body: { activo },
  });
}

export function archiveNino(id: string): Promise<NinoRecord> {
  return apiRequest<NinoRecord>(`${NINOS_ENDPOINT}/${id}/archivar`, {
    method: "PATCH",
  });
}

export function unarchiveNino(id: string): Promise<NinoRecord> {
  return apiRequest<NinoRecord>(`${NINOS_ENDPOINT}/${id}/desarchivar`, {
    method: "PATCH",
  });
}

export function asignarActorSocial(
  id: string,
  actorSocialId: string,
  motivo: string
): Promise<any> {
  return apiRequest<any>(`${NINOS_ENDPOINT}/${id}/asignar`, {
    method: "POST",
    body: { actorSocialId, motivo },
  });
}

export function desasignarActorSocial(id: string): Promise<any> {
  return apiRequest<any>(`${NINOS_ENDPOINT}/${id}/desasignar`, {
    method: "POST",
  });
}

export function listHistorialAsignaciones(id: string): Promise<any[]> {
  return apiRequest<any[]>(`${NINOS_ENDPOINT}/${id}/historial-asignaciones`);
}

