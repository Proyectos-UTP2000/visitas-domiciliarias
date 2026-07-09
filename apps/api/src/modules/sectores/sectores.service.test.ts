import { describe, expect, it, vi } from "vitest";
import { SectoresService } from "./sectores.service.js";

function createRepository(overrides: Record<string, unknown> = {}) {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    findByMunicipalidadAndCodigo: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActivo: vi.fn(),
    archive: vi.fn(),
    ...overrides,
  };
}

describe("SectoresService", () => {
  it("creates an active non-archived urban sector with only urban detail", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "sector-1",
      tipoSector: "URBANO",
      activo: true,
      archivado: false,
      urbano: { zona: "001", manzana: "A1" },
      rural: null,
    });
    const service = new SectoresService(
      createRepository({
        findByMunicipalidadAndCodigo: vi.fn().mockResolvedValue(null),
        create,
      }),
    );

    const result = await service.create({
      municipalidadId: "mun-1",
      codigo: "SEC-001",
      departamento: "Lima",
      provincia: "Lima",
      distrito: "Lima",
      centroPoblado: "Centro",
      nombreSector: "Sector 1",
      tipoSector: "URBANO",
      urbano: { zona: "001", manzana: "A1" },
    });

    expect(result).toMatchObject({ tipoSector: "URBANO", activo: true });
    expect(create).toHaveBeenCalledWith({
      municipalidadId: "mun-1",
      codigo: "SEC-001",
      departamento: "Lima",
      provincia: "Lima",
      distrito: "Lima",
      centroPoblado: "Centro",
      nombreSector: "Sector 1",
      tipoSector: "URBANO",
      urbano: { zona: "001", manzana: "A1" },
      activo: true,
      archivado: false,
    });
  });

  it("creates an active non-archived rural sector with only rural detail", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "sector-1",
      tipoSector: "RURAL",
      activo: true,
      archivado: false,
      urbano: null,
      rural: { latitud: -12.1, longitud: -77.1, poblacion: 150 },
    });
    const service = new SectoresService(
      createRepository({
        findByMunicipalidadAndCodigo: vi.fn().mockResolvedValue(null),
        create,
      }),
    );

    const result = await service.create({
      municipalidadId: "mun-1",
      codigo: "SEC-002",
      departamento: "Lima",
      provincia: "Lima",
      distrito: "Lima",
      centroPoblado: "Anexo",
      nombreSector: "Sector Rural",
      tipoSector: "RURAL",
      rural: { latitud: -12.1, longitud: -77.1, poblacion: 150 },
    });

    expect(result).toMatchObject({ tipoSector: "RURAL", activo: true });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoSector: "RURAL",
        rural: { latitud: -12.1, longitud: -77.1, poblacion: 150 },
        activo: true,
        archivado: false,
      }),
    );
  });

  it("rejects sector payloads that mix urban and rural details", async () => {
    const service = new SectoresService(createRepository());

    await expect(
      service.create({
        municipalidadId: "mun-1",
        codigo: "SEC-003",
        departamento: "Lima",
        provincia: "Lima",
        distrito: "Lima",
        centroPoblado: "Centro",
        nombreSector: "Sector mixto",
        tipoSector: "URBANO",
        urbano: { zona: "001", manzana: "A1" },
        rural: { poblacion: 20 },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects duplicate sector code within the same municipality", async () => {
    const service = new SectoresService(
      createRepository({
        findByMunicipalidadAndCodigo: vi
          .fn()
          .mockResolvedValue({ id: "sector-1" }),
      }),
    );

    await expect(
      service.create({
        municipalidadId: "mun-1",
        codigo: "SEC-001",
        departamento: "Lima",
        provincia: "Lima",
        distrito: "Lima",
        centroPoblado: "Centro",
        nombreSector: "Sector 1",
        tipoSector: "URBANO",
        urbano: { zona: "001", manzana: "A1" },
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("updates an existing sector and preserves urban/rural exclusivity", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "sector-1",
      tipoSector: "RURAL",
      rural: { poblacion: 50 },
      urbano: null,
    });
    const service = new SectoresService(
      createRepository({
        findById: vi.fn().mockResolvedValue({ id: "sector-1" }),
        update,
      }),
    );

    const result = await service.update("sector-1", {
      municipalidadId: "mun-1",
      codigo: "SEC-001",
      departamento: "Lima",
      provincia: "Lima",
      distrito: "Lima",
      centroPoblado: "Centro",
      nombreSector: "Sector editado",
      tipoSector: "RURAL",
      rural: { poblacion: 50 },
    });

    expect(result).toMatchObject({ tipoSector: "RURAL" });
    expect(update).toHaveBeenCalledWith("sector-1", {
      municipalidadId: "mun-1",
      codigo: "SEC-001",
      departamento: "Lima",
      provincia: "Lima",
      distrito: "Lima",
      centroPoblado: "Centro",
      nombreSector: "Sector editado",
      tipoSector: "RURAL",
      rural: { poblacion: 50 },
    });
  });

  it("activates or inactivates an existing sector", async () => {
    const setActivo = vi
      .fn()
      .mockResolvedValue({ id: "sector-1", activo: false });
    const service = new SectoresService(
      createRepository({
        findById: vi.fn().mockResolvedValue({ id: "sector-1" }),
        setActivo,
      }),
    );

    const result = await service.setActivo("sector-1", false);

    expect(result).toMatchObject({ activo: false });
    expect(setActivo).toHaveBeenCalledWith("sector-1", false);
  });

  it("archives an existing sector", async () => {
    const archive = vi
      .fn()
      .mockResolvedValue({ id: "sector-1", archivado: true });
    const service = new SectoresService(
      createRepository({
        findById: vi.fn().mockResolvedValue({ id: "sector-1" }),
        archive,
      }),
    );

    const result = await service.archive("sector-1");

    expect(result).toMatchObject({ archivado: true });
    expect(archive).toHaveBeenCalledWith("sector-1");
  });

  it("lists sectors filtered by municipalidadId", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const service = new SectoresService(createRepository({ list }));

    await service.list("mun-1");
    expect(list).toHaveBeenCalledWith("mun-1");
  });

  it("retrieves a sector by id using getById", async () => {
    const sector = { id: "sector-1", municipalidadId: "mun-1" };
    const findById = vi.fn().mockResolvedValue(sector);
    const service = new SectoresService(createRepository({ findById }));

    const result = await service.getById("sector-1");
    expect(result).toEqual(sector);
    expect(findById).toHaveBeenCalledWith("sector-1");
  });

  it("throws a 404 error if sector is not found in getById", async () => {
    const service = new SectoresService(
      createRepository({ findById: vi.fn().mockResolvedValue(null) })
    );

    await expect(service.getById("sector-nonexistent")).rejects.toMatchObject({
      statusCode: 404,
      message: "Sector no encontrado",
    });
  });
});
