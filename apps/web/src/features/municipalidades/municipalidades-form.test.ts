import { describe, expect, it } from "vitest";
import { getMunicipalidadFormTitle } from "./municipalidades-form";

describe("municipalidades form presentation", () => {
  it("uses modal titles for create and edit flows", () => {
    expect(getMunicipalidadFormTitle()).toBe("Nueva municipalidad");
    expect(getMunicipalidadFormTitle({ nombre: "Municipalidad de Lima" })).toBe(
      "Editar municipalidad",
    );
  });
});
