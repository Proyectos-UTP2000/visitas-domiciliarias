import { apiRequest } from "../../shared/api";
import type { ReporteActividadData, ReporteOperativoData } from "./reportes-types";

const ENDPOINT = "/reportes";

export interface ReporteActividadFilters {
  municipalidadId?: string | null;
  actorSocialId?: string | null;
  sectorId?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export function getReporteActividad(filters?: ReporteActividadFilters): Promise<ReporteActividadData> {
  let query = "";
  if (filters) {
    const params = new URLSearchParams();
    if (filters.municipalidadId) params.append("municipalidadId", filters.municipalidadId);
    if (filters.actorSocialId) params.append("actorSocialId", filters.actorSocialId);
    if (filters.sectorId) params.append("sectorId", filters.sectorId);
    if (filters.fechaInicio) params.append("fechaInicio", filters.fechaInicio);
    if (filters.fechaFin) params.append("fechaFin", filters.fechaFin);
    query = `?${params.toString()}`;
  }
  return apiRequest<ReporteActividadData>(`${ENDPOINT}/actividad${query}`);
}

export interface ReporteOperativoFilters {
  municipalidadId?: string | null;
  sectorId?: string | null;
}

export function getReporteOperativo(filters?: ReporteOperativoFilters): Promise<ReporteOperativoData> {
  let query = "";
  if (filters) {
    const params = new URLSearchParams();
    if (filters.municipalidadId) params.append("municipalidadId", filters.municipalidadId);
    if (filters.sectorId) params.append("sectorId", filters.sectorId);
    query = `?${params.toString()}`;
  }
  return apiRequest<ReporteOperativoData>(`${ENDPOINT}/operativos${query}`);
}
