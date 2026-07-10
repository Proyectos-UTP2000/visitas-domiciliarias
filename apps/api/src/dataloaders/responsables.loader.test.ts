import { describe, expect, it, vi } from "vitest";
import { seedResponsables, DEFAULT_RESPONSABLES } from "./responsables.loader.js";

describe("seedResponsables", () => {
  it("creates all default responsables if they do not exist", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "resp-id" });

    const createdCount = await seedResponsables({
      responsables: { findUnique, create } as any,
      municipalidades: { findFirst } as any,
    });

    expect(createdCount).toBe(3);
    expect(findFirst).toHaveBeenCalledTimes(3);
    expect(findUnique).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        municipalidadId: "muni-id",
        tipoDocumento: "DNI",
        dni: "11112222",
        nombres: "Maria Carmen",
        apellidos: "Delgado Flores",
        celular: "911222333",
        email: "maria.delgado@gmail.com",
        activo: true,
        archivado: false,
      },
    });
  });

  it("skips creating profiles that already exist", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findUnique = vi.fn().mockImplementation(({ where }) => {
      if (where.municipalidadId_tipoDocumento_dni.dni === "11112222") {
        return Promise.resolve({ id: "resp-id" });
      }
      return Promise.resolve(null);
    });
    const create = vi.fn().mockResolvedValue({ id: "resp-id" });

    const createdCount = await seedResponsables({
      responsables: { findUnique, create } as any,
      municipalidades: { findFirst } as any,
    });

    expect(createdCount).toBe(2);
    expect(findFirst).toHaveBeenCalledTimes(3);
    expect(findUnique).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
