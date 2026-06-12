import { describe, expect, it } from "vitest";
import {
  emptyEntidadForm,
  toEntidadForm,
  buildEntidadPayload,
  filterEntidades,
} from "./entidades-utils";
import type { EntidadRecord } from "./entidades-types";

const dummyRecords: EntidadRecord[] = [
  {
    id: "1",
    tipoEntidad: "MIDIS",
    codigo: "M01",
    nombre: "Ministerio de Desarrollo",
    activo: true,
    archivado: false,
  },
  {
    id: "2",
    tipoEntidad: "MINSA",
    codigo: "M02",
    nombre: "Ministerio de Salud",
    activo: false,
    archivado: false,
  },
];

describe("entidades-utils", () => {
  it("returns empty form", () => {
    expect(emptyEntidadForm).toEqual({
      tipoEntidad: "",
      codigo: "",
      nombre: "",
    });
  });

  it("converts record to form", () => {
    expect(toEntidadForm(dummyRecords[0])).toEqual({
      tipoEntidad: "MIDIS",
      codigo: "M01",
      nombre: "Ministerio de Desarrollo",
    });
  });

  it("builds clean payload", () => {
    const dirtyForm = {
      tipoEntidad: "  MIDIS  ",
      codigo: " M01\t",
      nombre: "\nMinisterio de Desarrollo ",
    };
    expect(buildEntidadPayload(dirtyForm)).toEqual({
      tipoEntidad: "MIDIS",
      codigo: "M01",
      nombre: "Ministerio de Desarrollo",
    });
  });

  it("filters records by search query", () => {
    expect(filterEntidades(dummyRecords, "salud")).toHaveLength(1);
    expect(filterEntidades(dummyRecords, "salud")[0].tipoEntidad).toBe("MINSA");
    expect(filterEntidades(dummyRecords, "M01")).toHaveLength(1);
    expect(filterEntidades(dummyRecords, "")).toHaveLength(2);
  });
});
