import { describe, expect, it, vi } from "vitest";
import { seedAsignacionesNinos, DEFAULT_ASIGNACIONES } from "./asignaciones-ninos.loader.js";

describe("seedAsignacionesNinos", () => {
  it("creates all default asignaciones if they do not exist", async () => {
    const findFirstMuni = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findFirstNino = vi.fn().mockResolvedValue({ id: "nino-id" });
    const findFirstActor = vi.fn().mockResolvedValue({ id: "actor-id" });
    const findUniqueUser = vi.fn().mockResolvedValue({ id: "user-id" });
    const findFirstAsignacion = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "asig-id" });

    const createdCount = await seedAsignacionesNinos({
      asignaciones: { findFirst: findFirstAsignacion, create } as any,
      municipalidades: { findFirst: findFirstMuni } as any,
      ninos: { findFirst: findFirstNino } as any,
      actoresSociales: { findFirst: findFirstActor } as any,
      usuarios: { findUnique: findUniqueUser } as any,
    });

    expect(createdCount).toBe(3);
    expect(findFirstMuni).toHaveBeenCalledTimes(3);
    expect(findFirstNino).toHaveBeenCalledTimes(3);
    expect(findFirstActor).toHaveBeenCalledTimes(3);
    expect(findUniqueUser).toHaveBeenCalledTimes(3);
    expect(findFirstAsignacion).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        ninoId: "nino-id",
        actorSocialId: "actor-id",
        asignadoPorId: "user-id",
        motivo: "Asignación inicial de sector urbano para seguimiento",
        activo: true,
      },
    });
  });

  it("skips creating assignments that already exist", async () => {
    const findFirstMuni = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findFirstNino = vi.fn().mockResolvedValue({ id: "nino-id" });
    const findFirstActor = vi.fn().mockResolvedValue({ id: "actor-id" });
    const findUniqueUser = vi.fn().mockResolvedValue({ id: "user-id" });
    const findFirstAsignacion = vi.fn().mockImplementation(({ where }) => {
      // Mock one existing
      if (where.ninoId === "nino-id" && where.actorSocialId === "actor-id") {
        return Promise.resolve({ id: "asig-id" });
      }
      return Promise.resolve(null);
    });
    const create = vi.fn().mockResolvedValue({ id: "asig-id" });

    const createdCount = await seedAsignacionesNinos({
      asignaciones: { findFirst: findFirstAsignacion, create } as any,
      municipalidades: { findFirst: findFirstMuni } as any,
      ninos: { findFirst: findFirstNino } as any,
      actoresSociales: { findFirst: findFirstActor } as any,
      usuarios: { findUnique: findUniqueUser } as any,
    });

    expect(createdCount).toBe(0); // All matched "nino-id" and "actor-id" due to mock
    expect(create).not.toHaveBeenCalled();
  });
});
