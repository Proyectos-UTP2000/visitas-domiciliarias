import type { SectorRecord, SectorFormState, TipoSector, CentroPobladoRecord, CentroPobladoFormState } from "./sectores-types";

export const emptyCentroPobladoForm = (tipo: "URBANO" | "RURAL"): CentroPobladoFormState => ({
  municipalidadId: "",
  nombre: "",
  codigo: "",
  tipo,
  latitud: "",
  longitud: "",
  poblacion: "",
});

export function toCentroPobladoForm(record: CentroPobladoRecord): CentroPobladoFormState {
  return {
    municipalidadId: record.municipalidadId,
    nombre: record.nombre,
    codigo: record.codigo || "",
    tipo: record.tipo,
    latitud: record.latitud !== null && record.latitud !== undefined ? record.latitud.toString() : "",
    longitud: record.longitud !== null && record.longitud !== undefined ? record.longitud.toString() : "",
    poblacion: record.poblacion !== null && record.poblacion !== undefined ? record.poblacion.toString() : "",
  };
}

export function filterCentrosPoblados(
  records: CentroPobladoRecord[],
  query: string,
  muniIdFilter: string
): CentroPobladoRecord[] {
  const q = query.trim().toLowerCase();
  return records.filter((r) => {
    if (muniIdFilter && r.municipalidadId !== muniIdFilter) {
      return false;
    }
    if (q) {
      const matchNombre = r.nombre.toLowerCase().includes(q);
      const matchCodigo = r.codigo?.toLowerCase().includes(q) || false;
      return matchNombre || matchCodigo;
    }
    return true;
  });
}

export const emptySectorForm = (tipoSector: TipoSector): SectorFormState => ({
  municipalidadId: "",
  centroPobladoId: "",
  codigo: "",
  departamento: "",
  provincia: "",
  distrito: "",
  nombreSector: "",
  tipoSector,
  zona: "",
  manzana: "",
  latitud: "",
  longitud: "",
  poblacion: "",
});

export function toSectorForm(record: SectorRecord): SectorFormState {
  return {
    municipalidadId: record.municipalidadId,
    centroPobladoId: record.centroPobladoId,
    codigo: record.codigo,
    departamento: record.departamento,
    provincia: record.provincia,
    distrito: record.distrito,
    nombreSector: record.nombreSector,
    tipoSector: record.tipoSector,
    zona: record.urbano?.zona || "",
    manzana: record.urbano?.manzana || "",
    latitud: record.rural?.latitud !== null && record.rural?.latitud !== undefined ? record.rural.latitud.toString() : "",
    longitud: record.rural?.longitud !== null && record.rural?.longitud !== undefined ? record.rural.longitud.toString() : "",
    poblacion: record.rural?.poblacion !== null && record.rural?.poblacion !== undefined ? record.rural.poblacion.toString() : "",
  };
}

export function filterSectores(
  records: SectorRecord[],
  query: string,
  tipoSector: TipoSector,
  muniIdFilter: string
): SectorRecord[] {
  const q = query.trim().toLowerCase();
  return records.filter((r) => {
    if (r.tipoSector !== tipoSector) {
      return false;
    }
    if (muniIdFilter && r.municipalidadId !== muniIdFilter) {
      return false;
    }
    if (q) {
      const matchCodigo = r.codigo.toLowerCase().includes(q);
      const matchCentroPoblado = r.centroPoblado?.nombre.toLowerCase().includes(q) || false;
      const matchSector = r.nombreSector.toLowerCase().includes(q);
      const matchZona = r.urbano?.zona.toLowerCase().includes(q) || false;
      const matchManzana = r.urbano?.manzana.toLowerCase().includes(q) || false;
      return matchCodigo || matchCentroPoblado || matchSector || matchZona || matchManzana;
    }
    return true;
  });
}
