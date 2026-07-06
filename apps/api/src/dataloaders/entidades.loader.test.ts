import { describe, expect, it, vi } from "vitest";
import { seedEntidades, DEFAULT_ENTIDADES } from "./entidades.loader.js";

describe("seedEntidades", () => {
  it("creates all default entidades if they do not exist", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "ent-id" });

    const createdCount = await seedEntidades({ findUnique, create } as any);

    expect(createdCount).toBe(20);
    expect(findUnique).toHaveBeenCalledTimes(20);
    expect(create).toHaveBeenCalledTimes(20);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        tipoEntidad: "Otras entidades públicas",
        codigo: "MIDIS",
        nombre: "MIDIS",
        activo: true,
        archivado: false,
      },
    });
  });

  it("skips creating entities that already exist", async () => {
    const findUnique = vi.fn().mockImplementation(({ where: { tipoEntidad_codigo } }) => {
      if (tipoEntidad_codigo.codigo === "MIDIS" || tipoEntidad_codigo.codigo === "CUNAMAS") {
        return Promise.resolve({ id: "existing-id" });
      }
      return Promise.resolve(null);
    });
    const create = vi.fn().mockResolvedValue({ id: "ent-id" });

    const createdCount = await seedEntidades({ findUnique, create } as any);

    expect(createdCount).toBe(18); // 20 - 2 existing
    expect(findUnique).toHaveBeenCalledTimes(20);
    expect(create).toHaveBeenCalledTimes(18);
  });
});
