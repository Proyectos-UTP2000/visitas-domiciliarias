import type { TipoActorSocialRecord } from "./tipos-actor-social-types";

export function getTipoActorSocialFormTitle(record: TipoActorSocialRecord | null): string {
  return record ? "Editar tipo de actor social" : "Nuevo tipo de actor social";
}
