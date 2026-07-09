import { apiRequest } from "../../shared/api";
import type { SectorRecord, SectorFormState, CentroPobladoRecord, CentroPobladoFormState } from "./sectores-types";

const BASE_ENDPOINT = "/sectores";
const CP_ENDPOINT = "/centros-poblados";

export function listCentrosPoblados(): Promise<CentroPobladoRecord[]> {
  return apiRequest<CentroPobladoRecord[]>(CP_ENDPOINT);
}

export function createCentroPoblado(form: CentroPobladoFormState): Promise<CentroPobladoRecord> {
  const payload = {
    municipalidadId: form.municipalidadId,
    nombre: form.nombre.trim(),
    codigo: form.codigo.trim() || null,
    tipo: form.tipo,
    latitud: form.tipo === "RURAL" && form.latitud ? parseFloat(form.latitud) : null,
    longitud: form.tipo === "RURAL" && form.longitud ? parseFloat(form.longitud) : null,
    poblacion: form.tipo === "RURAL" && form.poblacion ? parseInt(form.poblacion, 10) : null,
  };

  return apiRequest<CentroPobladoRecord>(CP_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export function updateCentroPoblado(id: string, form: CentroPobladoFormState): Promise<CentroPobladoRecord> {
  const payload = {
    nombre: form.nombre.trim(),
    codigo: form.codigo.trim() || null,
    latitud: form.tipo === "RURAL" && form.latitud ? parseFloat(form.latitud) : null,
    longitud: form.tipo === "RURAL" && form.longitud ? parseFloat(form.longitud) : null,
    poblacion: form.tipo === "RURAL" && form.poblacion ? parseInt(form.poblacion, 10) : null,
  };

  return apiRequest<CentroPobladoRecord>(`${CP_ENDPOINT}/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function setCentroPobladoActivo(id: string, activo: boolean): Promise<CentroPobladoRecord> {
  return apiRequest<CentroPobladoRecord>(`${CP_ENDPOINT}/${id}/activo`, {
    method: "PATCH",
    body: { activo },
  });
}

export function archivarCentroPoblado(id: string): Promise<CentroPobladoRecord> {
  return apiRequest<CentroPobladoRecord>(`${CP_ENDPOINT}/${id}/archivar`, {
    method: "PATCH",
  });
}

export function listSectores(municipalidadId?: string | null): Promise<SectorRecord[]> {
  const url = municipalidadId ? `${BASE_ENDPOINT}?municipalidadId=${municipalidadId}` : BASE_ENDPOINT;
  return apiRequest<SectorRecord[]>(url);
}

export function createSector(form: SectorFormState): Promise<SectorRecord> {
  const payload: any = {
    municipalidadId: form.municipalidadId,
    codigo: form.codigo,
    departamento: form.departamento,
    provincia: form.provincia,
    distrito: form.distrito,
    centroPobladoId: form.centroPobladoId,
    nombreSector: form.nombreSector,
    tipoSector: form.tipoSector,
  };

  if (form.tipoSector === "URBANO") {
    payload.urbano = {
      zona: form.zona.trim(),
      manzana: form.manzana.trim(),
    };
  } else {
    payload.rural = {
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      poblacion: form.poblacion ? parseInt(form.poblacion, 10) : null,
    };
  }

  return apiRequest<SectorRecord>(BASE_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export function updateSector(id: string, form: SectorFormState): Promise<SectorRecord> {
  const payload: any = {
    municipalidadId: form.municipalidadId,
    codigo: form.codigo,
    departamento: form.departamento,
    provincia: form.provincia,
    distrito: form.distrito,
    centroPobladoId: form.centroPobladoId,
    nombreSector: form.nombreSector,
    tipoSector: form.tipoSector,
  };

  if (form.tipoSector === "URBANO") {
    payload.urbano = {
      zona: form.zona.trim(),
      manzana: form.manzana.trim(),
    };
  } else {
    payload.rural = {
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      poblacion: form.poblacion ? parseInt(form.poblacion, 10) : null,
    };
  }

  return apiRequest<SectorRecord>(`${BASE_ENDPOINT}/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function setSectorActivo(id: string, activo: boolean): Promise<SectorRecord> {
  return apiRequest<SectorRecord>(`${BASE_ENDPOINT}/${id}/activo`, {
    method: "PATCH",
    body: { activo },
  });
}

export function archivarSector(id: string): Promise<SectorRecord> {
  return apiRequest<SectorRecord>(`${BASE_ENDPOINT}/${id}/archivar`, {
    method: "PATCH",
  });
}
