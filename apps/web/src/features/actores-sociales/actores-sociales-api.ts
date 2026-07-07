import { apiRequest } from "../../shared/api";
import type { ActorSocialRecord, ActorSocialFormState, EstadoActorSocial } from "./actores-sociales-types";

const BASE_ENDPOINT = "/actores-sociales";

export function listActores(municipalidadId?: string | null): Promise<ActorSocialRecord[]> {
  const url = municipalidadId ? `${BASE_ENDPOINT}?municipalidadId=${municipalidadId}` : BASE_ENDPOINT;
  return apiRequest<ActorSocialRecord[]>(url);
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

export function setActorEstado(id: string, estado: EstadoActorSocial): Promise<ActorSocialRecord> {
  return apiRequest<ActorSocialRecord>(`${BASE_ENDPOINT}/${id}/estado`, {
    method: "PATCH",
    body: { estado },
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
