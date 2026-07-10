import { apiRequest } from "../../shared/api";
import type {
  VisitaDomiciliariaRecord,
  ProgramarVisitaFormState,
  EjecutarVisitaFormState,
} from "./visitas-types";

const ENDPOINT = "/visitas";

export function listVisitas(filters?: {
  municipalidadId?: string | null;
  actorSocialId?: string | null;
  ninoId?: string | null;
  estado?: string | null;
}): Promise<VisitaDomiciliariaRecord[]> {
  let query = "";
  if (filters) {
    const params = new URLSearchParams();
    if (filters.municipalidadId) params.append("municipalidadId", filters.municipalidadId);
    if (filters.actorSocialId) params.append("actorSocialId", filters.actorSocialId);
    if (filters.ninoId) params.append("ninoId", filters.ninoId);
    if (filters.estado && filters.estado !== "TODOS") params.append("estado", filters.estado);
    query = `?${params.toString()}`;
  }
  return apiRequest<VisitaDomiciliariaRecord[]>(`${ENDPOINT}${query}`);
}

export function getVisitaById(id: string): Promise<VisitaDomiciliariaRecord> {
  return apiRequest<VisitaDomiciliariaRecord>(`${ENDPOINT}/${id}`);
}

export function programarVisita(payload: ProgramarVisitaFormState): Promise<VisitaDomiciliariaRecord> {
  return apiRequest<VisitaDomiciliariaRecord>(ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export function programarVisitasBulk(payload: { visitas: ProgramarVisitaFormState[] }): Promise<VisitaDomiciliariaRecord[]> {
  return apiRequest<VisitaDomiciliariaRecord[]>(`${ENDPOINT}/bulk`, {
    method: "POST",
    body: payload,
  });
}

export function ejecutarVisita(
  id: string,
  payload: EjecutarVisitaFormState
): Promise<VisitaDomiciliariaRecord> {
  return apiRequest<VisitaDomiciliariaRecord>(`${ENDPOINT}/${id}/ejecutar`, {
    method: "POST",
    body: {
      fechaEjecucion: payload.fechaEjecucion,
      peso: payload.peso.trim() ? parseFloat(payload.peso) : null,
      hierroEntregado: payload.hierroEntregado,
      consejeriaBrindada: payload.consejeriaBrindada,
      alertas: payload.alertas.trim() || null,
      comentarios: payload.comentarios.trim() || null,
      tipoRegistro: payload.tipoRegistro.trim() || null,
      latitud: payload.latitud.trim() || null,
      longitud: payload.longitud.trim() || null,
      evidenciaUrl: payload.evidenciaUrl.trim() || null,
    },
  });
}

export function marcarInconclusaVisita(
  id: string,
  motivoInconclusa: string
): Promise<VisitaDomiciliariaRecord> {
  return apiRequest<VisitaDomiciliariaRecord>(`${ENDPOINT}/${id}/inconclusa`, {
    method: "POST",
    body: { motivoInconclusa },
  });
}

export function reprogramarVisita(
  id: string,
  nuevaFechaProgramada: string,
  motivo: string
): Promise<any> {
  return apiRequest<any>(`${ENDPOINT}/${id}/reprogramar`, {
    method: "POST",
    body: { nuevaFechaProgramada, motivo },
  });
}
