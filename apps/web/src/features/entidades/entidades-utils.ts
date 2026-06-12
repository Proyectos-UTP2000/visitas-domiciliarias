import type { EntidadFormState, EntidadRecord } from "./entidades-types";

export const emptyEntidadForm: EntidadFormState = {
  tipoEntidad: "",
  codigo: "",
  nombre: "",
};

export function toEntidadForm(record: EntidadRecord): EntidadFormState {
  return {
    tipoEntidad: record.tipoEntidad,
    codigo: record.codigo,
    nombre: record.nombre,
  };
}

export function buildEntidadPayload(form: EntidadFormState): EntidadFormState {
  return {
    tipoEntidad: form.tipoEntidad.trim(),
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
  };
}

export function filterEntidades(
  records: EntidadRecord[],
  query: string,
): EntidadRecord[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return records;
  }
  return records.filter(
    (r) =>
      r.tipoEntidad.toLowerCase().includes(cleanQuery) ||
      r.codigo.toLowerCase().includes(cleanQuery) ||
      r.nombre.toLowerCase().includes(cleanQuery),
  );
}
