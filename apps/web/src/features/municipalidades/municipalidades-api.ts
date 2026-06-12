import { apiRequest } from "../../shared/api";
import type {
  MunicipalidadPayload,
  MunicipalidadRecord,
} from "./municipalidades-types";

const MUNICIPALIDADES_ENDPOINT = "/municipalidades";

export function listMunicipalidades() {
  return apiRequest<MunicipalidadRecord[]>(MUNICIPALIDADES_ENDPOINT);
}

export function createMunicipalidad(payload: MunicipalidadPayload) {
  return apiRequest<MunicipalidadRecord>(MUNICIPALIDADES_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export function updateMunicipalidad(
  id: string,
  payload: MunicipalidadPayload,
) {
  return apiRequest<MunicipalidadRecord>(`${MUNICIPALIDADES_ENDPOINT}/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function setMunicipalidadActivo(id: string, activo: boolean) {
  return apiRequest<MunicipalidadRecord>(
    `${MUNICIPALIDADES_ENDPOINT}/${id}/activo`,
    {
      method: "PATCH",
      body: { activo },
    },
  );
}
