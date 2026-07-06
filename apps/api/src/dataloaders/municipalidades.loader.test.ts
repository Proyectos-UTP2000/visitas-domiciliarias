import { describe, expect, it, vi } from "vitest";
import { seedMunicipalidades, DEFAULT_MUNICIPALIDADES } from "./municipalidades.loader.js";

describe("seedMunicipalidades", () => {
  it("creates all default municipalidades if they do not exist", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "mun-id" });

    const createdCount = await seedMunicipalidades({ findUnique, create } as any);

    expect(createdCount).toBe(2);
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        ubigeo: "060806",
        departamento: "CAJAMARCA",
        provincia: "JAEN",
        distrito: "POMAHUACA",
        codigo: "POM",
        nombre: "MUNICIPALIDAD DISTRITAL DE POMAHUACA",
        tipo: "DISTRITAL",
        prioridad: 1,
        activo: true,
        archivado: false,
      },
    });
  });

  it("skips creating municipalidades that already exist", async () => {
    const findUnique = vi.fn().mockImplementation(({ where: { ubigeo_codigo } }) => {
      if (ubigeo_codigo.codigo === "POM") {
        return Promise.resolve({ id: "pom-id" });
      }
      return Promise.resolve(null);
    });
    const create = vi.fn().mockResolvedValue({ id: "mun-id" });

    const createdCount = await seedMunicipalidades({ findUnique, create } as any);

    expect(createdCount).toBe(1); // Only Lima should be created
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        ubigeo: "150101",
        departamento: "LIMA",
        provincia: "LIMA",
        distrito: "LIMA",
        codigo: "LIM",
        nombre: "MUNICIPALIDAD METROPOLITANA DE LIMA",
        tipo: "PROVINCIAL",
        prioridad: 2,
        activo: true,
        archivado: false,
      },
    });
  });
});
