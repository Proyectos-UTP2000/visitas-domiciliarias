import { apiRequest } from "../../shared/api";
import type { ResponsableFormState, ResponsableRecord } from "./responsables-types";

const RESPONSABLES_ENDPOINT = "/responsables";

export function listResponsables(municipalidadId?: string | null): Promise<ResponsableRecord[]> {
  const url = municipalidadId ? `${RESPONSABLES_ENDPOINT}?municipalidadId=${municipalidadId}` : RESPONSABLES_ENDPOINT;
  return apiRequest<ResponsableRecord[]>(url);
}

export function getResponsableById(id: string): Promise<ResponsableRecord> {
  return apiRequest<ResponsableRecord>(`${RESPONSABLES_ENDPOINT}/${id}`);
}

export function createResponsable(payload: ResponsableFormState): Promise<ResponsableRecord> {
  return apiRequest<ResponsableRecord>(RESPONSABLES_ENDPOINT, {
    method: "POST",
    body: {
      ...payload,
      celular: payload.celular.trim() || null,
      email: payload.email.trim() || null,
    },
  });
}

export function updateResponsable(
  id: string,
  payload: Omit<ResponsableFormState, "municipalidadId">
): Promise<ResponsableRecord> {
  return apiRequest<ResponsableRecord>(`${RESPONSABLES_ENDPOINT}/${id}`, {
    method: "PUT",
    body: {
      ...payload,
      celular: payload.celular.trim() || null,
      email: payload.email.trim() || null,
    },
  });
}

export function setResponsableActivo(
  id: string,
  activo: boolean
): Promise<ResponsableRecord> {
  return apiRequest<ResponsableRecord>(`${RESPONSABLES_ENDPOINT}/${id}/activo`, {
    method: "PATCH",
    body: { activo },
  });
}

export function archiveResponsable(id: string): Promise<ResponsableRecord> {
  return apiRequest<ResponsableRecord>(`${RESPONSABLES_ENDPOINT}/${id}/archivar`, {
    method: "PATCH",
  });
}
