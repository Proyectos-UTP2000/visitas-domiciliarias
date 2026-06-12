import { describe, expect, it } from "vitest";
import {
  emptyGrupoForm,
  emptyEstablecimientoForm,
  emptyMiembroForm,
  filterGrupos,
  filterMiembros,
} from "./grupos-utils";
import type { GrupoTrabajoRecord, MiembroGrupoRecord } from "./grupos-types";

const mockGrupos: GrupoTrabajoRecord[] = [
  {
    id: "g-1",
    municipalidadId: "m-1",
    fechaLimite: "2026-12-31",
    nombreGrupo: "Grupo Norte",
    periodoYear: 2026,
    dniRepresentante: "12345678",
    nombreRepresentante: "Juan",
    apellidosRepresentante: "Perez",
    estado: "BORRADOR",
    observaciones: null,
    activo: true,
    archivado: false,
  },
  {
    id: "g-2",
    municipalidadId: "m-2",
    fechaLimite: "2026-06-30",
    nombreGrupo: "Grupo Sur",
    periodoYear: 2025,
    dniRepresentante: "87654321",
    nombreRepresentante: "Maria",
    apellidosRepresentante: "Gomez",
    estado: "VALIDADO",
    observaciones: null,
    activo: true,
    archivado: false,
  },
];

const mockMiembros: MiembroGrupoRecord[] = [
  {
    id: "mi-1",
    grupoTrabajoId: "g-1",
    grupoEstablecimientoId: "est-1",
    cargoMiembroGrupoId: "cargo-president",
    dni: "11111111",
    nombres: "Luis",
    apellidos: "Lujan",
    celular: "999888777",
    email: "luis@mail.com",
    activo: true,
    archivado: false,
  },
  {
    id: "mi-2",
    grupoTrabajoId: "g-1",
    grupoEstablecimientoId: null,
    cargoMiembroGrupoId: "cargo-secretary",
    dni: "22222222",
    nombres: "Ana",
    apellidos: "Alva",
    celular: null,
    email: null,
    activo: false,
    archivado: false,
  },
];

describe("grupos-utils", () => {
  it("returns empty forms", () => {
    expect(emptyGrupoForm).toEqual({
      municipalidadId: "",
      fechaLimite: "",
      nombreGrupo: "",
      periodoYear: "",
      dniRepresentante: "",
      nombreRepresentante: "",
      apellidosRepresentante: "",
    });
    expect(emptyEstablecimientoForm).toEqual({
      nombre: "",
      codigo: "",
      direccion: "",
    });
    expect(emptyMiembroForm).toEqual({
      grupoEstablecimientoId: "",
      cargoMiembroGrupoId: "",
      dni: "",
      nombres: "",
      apellidos: "",
      celular: "",
      email: "",
    });
  });

  it("filters groups by search query, state, period, and municipality", () => {
    expect(filterGrupos(mockGrupos, "Norte")).toHaveLength(1);
    expect(filterGrupos(mockGrupos, "", "VALIDADO")).toHaveLength(1);
    expect(filterGrupos(mockGrupos, "", "", 2025)).toHaveLength(1);
    expect(filterGrupos(mockGrupos, "", "", undefined, "m-1")).toHaveLength(1);
  });

  it("filters members by search query, state, cargo, and establishment", () => {
    expect(filterMiembros(mockMiembros, "Lujan")).toHaveLength(1);
    expect(filterMiembros(mockMiembros, "", "active")).toHaveLength(1);
    expect(filterMiembros(mockMiembros, "", "", "cargo-secretary")).toHaveLength(1);
    expect(filterMiembros(mockMiembros, "", "", "", "est-1")).toHaveLength(1);
  });
});
