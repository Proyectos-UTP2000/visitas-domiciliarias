import { describe, expect, it } from "vitest";
import { getTipoActorSocialFormTitle } from "./tipos-actor-social-form";

describe("tipos-actor-social-form", () => {
  it("returns correct modal title", () => {
    expect(getTipoActorSocialFormTitle(null)).toBe("Nuevo tipo de actor social");
    expect(
      getTipoActorSocialFormTitle({
        id: "1",
        tipoActor: "X",
        tarifaRural: 1,
        tarifaUrbana: 2,
        orden: 1,
        codigo: "A",
        activo: true,
        archivado: false,
      }),
    ).toBe("Editar tipo de actor social");
  });
});
