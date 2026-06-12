import type {
  MunicipalidadFormState,
  MunicipalidadPayload,
  MunicipalidadRecord,
  TipoMunicipalidad,
} from "./municipalidades-types";

export const emptyMunicipalidadForm: MunicipalidadFormState = {
  ubigeo: "",
  departamento: "",
  provincia: "",
  distrito: "",
  codigo: "",
  nombre: "",
  tipo: "DISTRITAL",
  prioridad: "0",
};

export function formatTipoMunicipalidad(tipo: TipoMunicipalidad) {
  return tipo === "PROVINCIAL" ? "Provincial" : "Distrital";
}

export function toMunicipalidadForm(
  municipalidad: MunicipalidadRecord,
): MunicipalidadFormState {
  return {
    ubigeo: municipalidad.ubigeo,
    departamento: municipalidad.departamento,
    provincia: municipalidad.provincia,
    distrito: municipalidad.distrito,
    codigo: municipalidad.codigo,
    nombre: municipalidad.nombre,
    tipo: municipalidad.tipo,
    prioridad: String(municipalidad.prioridad),
  };
}

export function buildMunicipalidadPayload(
  form: MunicipalidadFormState,
): MunicipalidadPayload {
  return {
    ubigeo: form.ubigeo.trim(),
    departamento: form.departamento.trim(),
    provincia: form.provincia.trim(),
    distrito: form.distrito.trim(),
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
    tipo: form.tipo,
    prioridad: Number(form.prioridad),
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filterMunicipalidades(
  municipalidades: MunicipalidadRecord[],
  query: string,
) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return municipalidades;
  }

  return municipalidades.filter((municipalidad) => {
    const haystack = normalizeSearch(
      [
        municipalidad.ubigeo,
        municipalidad.departamento,
        municipalidad.provincia,
        municipalidad.distrito,
        municipalidad.codigo,
        municipalidad.nombre,
        formatTipoMunicipalidad(municipalidad.tipo),
        municipalidad.activo ? "activo" : "inactivo",
      ].join(" "),
    );

    return terms.every((term) => haystack.includes(term));
  });
}
