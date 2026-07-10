import { describe, expect, it, vi } from "vitest";
import { seedNinos, DEFAULT_NINOS } from "./ninos.loader.js";

describe("seedNinos", () => {
  it("creates all default ninos if they do not exist", async () => {
    const findFirstMuni = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findFirstNino = vi.fn().mockResolvedValue(null);
    const findFirstResp = vi.fn().mockResolvedValue({ id: "resp-id" });
    const findUniqueSector = vi.fn().mockResolvedValue({ id: "sector-id" });
    const create = vi.fn().mockResolvedValue({ id: "nino-id" });

    const createdCount = await seedNinos({
      ninos: { findFirst: findFirstNino, create } as any,
      municipalidades: { findFirst: findFirstMuni } as any,
      responsables: { findFirst: findFirstResp } as any,
      sectores: { findUnique: findUniqueSector } as any,
    });

    expect(createdCount).toBe(3);
    expect(findFirstMuni).toHaveBeenCalledTimes(3);
    expect(findFirstNino).toHaveBeenCalledTimes(3);
    expect(findFirstResp).toHaveBeenCalledTimes(3);
    expect(findUniqueSector).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        municipalidadId: "muni-id",
        responsableId: "resp-id",
        sectorId: "sector-id",
        dni: "55556666",
        cnv: "CNV-VIC-001",
        nombres: "Thiago Mateo",
        apellidos: "Delgado Flores",
        sexo: "MASCULINO",
        fechaNac: new Date("2026-01-15"),
        direccion: "Av. Larco 123",
        referencia: "Frente a la plaza principal",
        latitud: -6.791,
        longitud: -79.842,
        activo: true,
        archivado: false,
      },
    });
  });

  it("skips creating ninos that already exist", async () => {
    const findFirstMuni = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findFirstNino = vi.fn().mockImplementation(({ where }) => {
      if (where.dni === "55556666") {
        return Promise.resolve({ id: "nino-id" });
      }
      return Promise.resolve(null);
    });
    const findFirstResp = vi.fn().mockResolvedValue({ id: "resp-id" });
    const findUniqueSector = vi.fn().mockResolvedValue({ id: "sector-id" });
    const create = vi.fn().mockResolvedValue({ id: "nino-id" });

    const createdCount = await seedNinos({
      ninos: { findFirst: findFirstNino, create } as any,
      municipalidades: { findFirst: findFirstMuni } as any,
      responsables: { findFirst: findFirstResp } as any,
      sectores: { findUnique: findUniqueSector } as any,
    });

    expect(createdCount).toBe(2);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
