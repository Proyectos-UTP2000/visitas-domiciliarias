import { describe, expect, it, vi } from "vitest";
import { seedCargosMiembroGrupo, DEFAULT_CARGOS } from "./cargos-miembro-grupo.loader.js";

describe("seedCargosMiembroGrupo", () => {
  it("creates all default cargos if they do not exist", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "cargo-id" });

    const createdCount = await seedCargosMiembroGrupo({ findUnique, create } as any);

    expect(createdCount).toBe(4);
    expect(findUnique).toHaveBeenCalledTimes(4);
    expect(create).toHaveBeenCalledTimes(4);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        nombre: "Presidente",
        descripcion: "Presidente del grupo de trabajo",
        orden: 1,
        activo: true,
      },
    });
  });

  it("skips creating cargos that already exist", async () => {
    const findUnique = vi.fn().mockImplementation(({ where: { nombre } }) => {
      if (nombre === "Presidente" || nombre === "Secretario") {
        return Promise.resolve({ id: "existing-id" });
      }
      return Promise.resolve(null);
    });
    const create = vi.fn().mockResolvedValue({ id: "cargo-id" });

    const createdCount = await seedCargosMiembroGrupo({ findUnique, create } as any);

    expect(createdCount).toBe(2); // 4 - 2 existing
    expect(findUnique).toHaveBeenCalledTimes(4);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
