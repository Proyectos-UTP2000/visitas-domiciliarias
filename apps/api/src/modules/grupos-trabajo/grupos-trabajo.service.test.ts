import { describe, expect, it, vi } from "vitest";
import { GruposTrabajoService } from "./grupos-trabajo.service.js";

function createRepository(overrides: Record<string, unknown> = {}) {
  return {
    list: vi.fn().mockResolvedValue([]),
    findGrupoById: vi.fn().mockResolvedValue({ id: "grupo-1", municipalidadId: "mun-1", estado: "BORRADOR" }),
    findFullGrupoById: vi.fn().mockResolvedValue({
      id: "grupo-1",
      municipalidadId: "mun-1",
      estado: "BORRADOR",
      miembros: [],
      establecimientos: [],
      archivos: [],
    }),
    findCargoById: vi.fn(),
    findEstablecimientoById: vi.fn(),
    createGrupo: vi.fn(),
    updateGrupo: vi.fn(),
    createEstablecimiento: vi.fn(),
    createMiembro: vi.fn(),
    updateMiembroContacto: vi.fn(),
    setMiembroActivo: vi.fn(),
    deleteMiembro: vi.fn(),
    createArchivo: vi.fn(),
    findArchivoById: vi.fn(),
    listArchivos: vi.fn(),
    deleteArchivo: vi.fn(),
    ...overrides,
  };
}

describe("GruposTrabajoService", () => {
  it("creates a draft active group in the requested municipality", async () => {
    const createGrupo = vi.fn().mockResolvedValue({
      id: "grupo-1",
      municipalidadId: "mun-1",
      nombreGrupo: "Grupo 2026",
      estado: "BORRADOR",
      activo: true,
      archivado: false,
    });
    const service = new GruposTrabajoService(createRepository({ createGrupo }));

    const result = await service.createGrupo({
      municipalidadId: "mun-1",
      fechaLimite: "2026-07-01",
      nombreGrupo: "Grupo 2026",
      periodoYear: 2026,
      dniRepresentante: "12345678",
      nombreRepresentante: "Rosa",
      apellidosRepresentante: "Pérez Quispe",
    });

    expect(result).toMatchObject({ estado: "BORRADOR", activo: true });
    expect(createGrupo).toHaveBeenCalledWith({
      municipalidadId: "mun-1",
      fechaLimite: new Date("2026-07-01T00:00:00.000Z"),
      nombreGrupo: "Grupo 2026",
      periodoYear: 2026,
      dniRepresentante: "12345678",
      nombreRepresentante: "Rosa",
      apellidosRepresentante: "Pérez Quispe",
      estado: "BORRADOR",
      activo: true,
      archivado: false,
    });
  });

  it("creates an establishment only for an existing group", async () => {
    const createEstablecimiento = vi.fn().mockResolvedValue({
      id: "est-1",
      grupoTrabajoId: "grupo-1",
      nombre: "Centro de Salud A",
      activo: true,
    });
    const service = new GruposTrabajoService(
      createRepository({
        findGrupoById: vi.fn().mockResolvedValue({ id: "grupo-1", estado: "BORRADOR" }),
        createEstablecimiento,
      }),
    );

    const result = await service.createEstablecimiento("grupo-1", {
      nombre: "Centro de Salud A",
      codigo: "CSA",
      direccion: "Av. Central 123",
    });

    expect(result).toMatchObject({ id: "est-1", activo: true });
    expect(createEstablecimiento).toHaveBeenCalledWith({
      grupoTrabajoId: "grupo-1",
      nombre: "Centro de Salud A",
      codigo: "CSA",
      direccion: "Av. Central 123",
      activo: true,
    });
  });

  it("rejects establishment creation when group does not exist", async () => {
    const service = new GruposTrabajoService(
      createRepository({ findGrupoById: vi.fn().mockResolvedValue(null) }),
    );

    await expect(
      service.createEstablecimiento("grupo-1", { nombre: "Centro" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("creates a member with cargo and optional establishment from the same group", async () => {
    const createMiembro = vi.fn().mockResolvedValue({
      id: "miembro-1",
      grupoTrabajoId: "grupo-1",
      grupoEstablecimientoId: "est-1",
      cargoMiembroGrupoId: "cargo-1",
      activo: true,
      archivado: false,
    });
    const service = new GruposTrabajoService(
      createRepository({
        findGrupoById: vi.fn().mockResolvedValue({ id: "grupo-1" }),
        findCargoById: vi.fn().mockResolvedValue({ id: "cargo-1" }),
        findEstablecimientoById: vi.fn().mockResolvedValue({
          id: "est-1",
          grupoTrabajoId: "grupo-1",
        }),
        createMiembro,
      }),
    );

    const result = await service.createMiembro("grupo-1", {
      grupoEstablecimientoId: "est-1",
      cargoMiembroGrupoId: "cargo-1",
      dni: "87654321",
      nombres: "Juan",
      apellidos: "Rojas Díaz",
      celular: "987654321",
      email: "juan@example.com",
    });

    expect(result).toMatchObject({ id: "miembro-1", activo: true });
    expect(createMiembro).toHaveBeenCalledWith({
      grupoTrabajoId: "grupo-1",
      grupoEstablecimientoId: "est-1",
      cargoMiembroGrupoId: "cargo-1",
      dni: "87654321",
      nombres: "Juan",
      apellidos: "Rojas Díaz",
      celular: "987654321",
      email: "juan@example.com",
      activo: true,
      archivado: false,
    });
  });

  it("rejects a member establishment from another group", async () => {
    const service = new GruposTrabajoService(
      createRepository({
        findGrupoById: vi.fn().mockResolvedValue({ id: "grupo-1" }),
        findCargoById: vi.fn().mockResolvedValue({ id: "cargo-1" }),
        findEstablecimientoById: vi.fn().mockResolvedValue({
          id: "est-2",
          grupoTrabajoId: "grupo-2",
        }),
      }),
    );

    await expect(
      service.createMiembro("grupo-1", {
        grupoEstablecimientoId: "est-2",
        cargoMiembroGrupoId: "cargo-1",
        dni: "87654321",
        nombres: "Juan",
        apellidos: "Rojas Díaz",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("updates only member establishment and contact fields", async () => {
    const updateMiembroContacto = vi.fn().mockResolvedValue({
      id: "miembro-1",
      grupoEstablecimientoId: "est-1",
      celular: "987654321",
      email: "juan@example.com",
    });
    const service = new GruposTrabajoService(
      createRepository({
        findGrupoById: vi.fn().mockResolvedValue({ id: "grupo-1", estado: "BORRADOR" }),
        findEstablecimientoById: vi.fn().mockResolvedValue({
          id: "est-1",
          grupoTrabajoId: "grupo-1",
        }),
        updateMiembroContacto,
      }),
    );

    const result = await service.updateMiembroContacto("grupo-1", "miembro-1", {
      grupoEstablecimientoId: "est-1",
      celular: "987654321",
      email: "juan@example.com",
    });

    expect(result).toMatchObject({ id: "miembro-1", celular: "987654321" });
    expect(updateMiembroContacto).toHaveBeenCalledWith("grupo-1", "miembro-1", {
      grupoEstablecimientoId: "est-1",
      celular: "987654321",
      email: "juan@example.com",
    });
  });

  it("logically deletes a member with a mandatory reason", async () => {
    const deleteMiembro = vi.fn().mockResolvedValue({
      id: "miembro-1",
      archivado: true,
      motivoEliminacion: "Duplicado",
      notificationMessage:
        "Se notificó al administrador general para su revisión.",
    });
    const service = new GruposTrabajoService(
      createRepository({ deleteMiembro }),
    );

    const result = await service.deleteMiembro("grupo-1", "miembro-1", {
      motivoEliminacion: "Duplicado",
    });

    expect(result).toMatchObject({
      archivado: true,
      notificationMessage:
        "Se notificó al administrador general para su revisión.",
    });
    expect(deleteMiembro).toHaveBeenCalledWith("grupo-1", "miembro-1", {
      motivoEliminacion: "Duplicado",
    });
  });

  it("rejects logical deletion without reason", async () => {
    const service = new GruposTrabajoService(createRepository());

    await expect(
      service.deleteMiembro("grupo-1", "miembro-1", { motivoEliminacion: " " }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("updates a group's state", async () => {
    const updateGrupoEstado = vi.fn().mockResolvedValue({
      id: "grupo-1",
      estado: "VALIDADO",
      observaciones: null,
    });
    const service = new GruposTrabajoService(
      createRepository({ updateGrupoEstado }),
    );

    const result = await service.updateGrupoEstado("grupo-1", "VALIDADO");
    expect(result).toMatchObject({ estado: "VALIDADO" });
    expect(updateGrupoEstado).toHaveBeenCalledWith("grupo-1", "VALIDADO", null);
  });

  it("requires observations when status is OBSERVADO or RECHAZADO", async () => {
    const service = new GruposTrabajoService(createRepository());

    await expect(
      service.updateGrupoEstado("grupo-1", "OBSERVADO", " "),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      service.updateGrupoEstado("grupo-1", "RECHAZADO", ""),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects representative DNI duplicate on createGrupo", async () => {
    const service = new GruposTrabajoService(
      createRepository({
        list: vi.fn().mockResolvedValue([
          { dniRepresentante: "12345678", periodoYear: 2026 },
        ]),
      }),
    );

    await expect(
      service.createGrupo({
        municipalidadId: "mun-1",
        fechaLimite: "2026-07-01",
        nombreGrupo: "Grupo 2026 B",
        periodoYear: 2026,
        dniRepresentante: "12345678",
        nombreRepresentante: "Juan",
        apellidosRepresentante: "Perez",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects modifications when group is not in BORRADOR or OBSERVADO", async () => {
    const service = new GruposTrabajoService(
      createRepository({
        findGrupoById: vi.fn().mockResolvedValue({ id: "grupo-1", estado: "REGISTRADO" }),
      }),
    );

    await expect(
      service.createEstablecimiento("grupo-1", { nombre: "Posta B" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects member DNI duplicate inside a group", async () => {
    const service = new GruposTrabajoService(
      createRepository({
        findFullGrupoById: vi.fn().mockResolvedValue({
          id: "grupo-1",
          estado: "BORRADOR",
          miembros: [{ dni: "12345678" }],
        }),
      }),
    );

    await expect(
      service.createMiembro("grupo-1", {
        cargoMiembroGrupoId: "cargo-1",
        dni: "12345678",
        nombres: "Juan",
        apellidos: "Perez",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
