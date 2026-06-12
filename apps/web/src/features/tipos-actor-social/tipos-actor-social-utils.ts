import type { TipoActorSocialFormState, TipoActorSocialRecord } from "./tipos-actor-social-types";

export const emptyTipoActorSocialForm: TipoActorSocialFormState = {
  tipoActor: "",
  tarifaRural: "",
  tarifaUrbana: "",
  orden: "",
  codigo: "",
};

export function toTipoActorSocialForm(record: TipoActorSocialRecord): TipoActorSocialFormState {
  return {
    tipoActor: record.tipoActor,
    tarifaRural: String(record.tarifaRural),
    tarifaUrbana: String(record.tarifaUrbana),
    orden: String(record.orden),
    codigo: record.codigo,
  };
}

export function buildTipoActorSocialPayload(form: TipoActorSocialFormState) {
  return {
    tipoActor: form.tipoActor.trim(),
    tarifaRural: parseFloat(form.tarifaRural) || 0,
    tarifaUrbana: parseFloat(form.tarifaUrbana) || 0,
    orden: parseInt(form.orden, 10) || 0,
    codigo: form.codigo.trim(),
  };
}

export function filterTiposActorSocial(
  records: TipoActorSocialRecord[],
  query: string,
): TipoActorSocialRecord[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return records;
  }
  return records.filter(
    (r) =>
      r.tipoActor.toLowerCase().includes(cleanQuery) ||
      r.codigo.toLowerCase().includes(cleanQuery),
  );
}
