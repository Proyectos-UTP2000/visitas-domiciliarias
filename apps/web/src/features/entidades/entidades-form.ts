import type { EntidadRecord } from "./entidades-types";

export function getEntidadFormTitle(record: EntidadRecord | null): string {
  return record ? "Editar entidad" : "Nueva entidad";
}
