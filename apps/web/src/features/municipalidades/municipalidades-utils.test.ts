import { describe, expect, it } from "vitest";
import {
  buildMunicipalidadPayload,
  filterMunicipalidades,
  formatTipoMunicipalidad,
} from "./municipalidades-utils";
import type { MunicipalidadFormState, MunicipalidadRecord } from "./municipalidades-types";

const municipalidades: MunicipalidadRecord[] = [
  {
    id: "mun-1",
    ubigeo: "140106",
    departamento: "Lambayeque",
    provincia: "Chiclayo",
    distrito: "La Victoria",
    codigo: "001",
    nombre: "Municipalidad Distrital de La Victoria",
    tipo: "DISTRITAL",
    prioridad: 2,
    activo: true,
    archivado: false,
  },
  {
    id: "mun-2",
    ubigeo: "150101",
    departamento: "Lima",
    provincia: "Lima",
    distrito: "Lima",
    codigo: "002",
    nombre: "Municipalidad Provincial de Lima",
    tipo: "PROVINCIAL",
    prioridad: 1,
    activo: false,
    archivado: false,
  },
];

describe("municipalidades utils", () => {
  it("filters by ubigeo, location and municipalidad name", () => {
    expect(filterMunicipalidades(municipalidades, "140106")).toHaveLength(1);
    expect(filterMunicipalidades(municipalidades, "chiclayo")[0].id).toBe(
      "mun-1",
    );
    expect(filterMunicipalidades(municipalidades, "provincial lima")[0].id).toBe(
      "mun-2",
    );
  });

  it("builds the backend payload trimming text and coercing priority", () => {
    const form: MunicipalidadFormState = {
      ubigeo: " 140106 ",
      departamento: " Lambayeque ",
      provincia: " Chiclayo ",
      distrito: " La Victoria ",
      codigo: " 001 ",
      nombre: " Municipalidad Distrital de La Victoria ",
      tipo: "DISTRITAL",
      prioridad: "5",
    };

    expect(buildMunicipalidadPayload(form)).toEqual({
      ubigeo: "140106",
      departamento: "Lambayeque",
      provincia: "Chiclayo",
      distrito: "La Victoria",
      codigo: "001",
      nombre: "Municipalidad Distrital de La Victoria",
      tipo: "DISTRITAL",
      prioridad: 5,
    });
  });

  it("formats municipality type for the table", () => {
    expect(formatTipoMunicipalidad("DISTRITAL")).toBe("Distrital");
    expect(formatTipoMunicipalidad("PROVINCIAL")).toBe("Provincial");
  });
});
