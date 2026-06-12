import { describe, expect, it } from "vitest";
import { getEntidadFormTitle } from "./entidades-form";

describe("entidades-form", () => {
  it("returns appropriate title", () => {
    expect(getEntidadFormTitle(null)).toBe("Nueva entidad");
    expect(
      getEntidadFormTitle({
        id: "1",
        tipoEntidad: "X",
        codigo: "Y",
        nombre: "Z",
        activo: true,
        archivado: false,
      }),
    ).toBe("Editar entidad");
  });
});
