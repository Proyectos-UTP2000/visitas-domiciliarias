import { describe, expect, it, vi } from "vitest";
import { seedVisitasDomiciliarias, DEFAULT_VISITAS } from "./visitas-domiciliarias.loader.js";

describe("seedVisitasDomiciliarias", () => {
  it("creates all default visitas if they do not exist", async () => {
    const findFirstMuni = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findFirstNino = vi.fn().mockResolvedValue({ id: "nino-id" });
    const findFirstActor = vi.fn().mockResolvedValue({ id: "actor-id" });
    const findFirstVisita = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "visita-id" });

    const createdCount = await seedVisitasDomiciliarias({
      visitas: { findFirst: findFirstVisita, create } as any,
      municipalidades: { findFirst: findFirstMuni } as any,
      ninos: { findFirst: findFirstNino } as any,
      actoresSociales: { findFirst: findFirstActor } as any,
    });

    expect(createdCount).toBe(5);
    expect(findFirstMuni).toHaveBeenCalledTimes(5);
    expect(findFirstNino).toHaveBeenCalledTimes(5);
    expect(findFirstActor).toHaveBeenCalledTimes(5);
    expect(findFirstVisita).toHaveBeenCalledTimes(5);
    expect(create).toHaveBeenCalledTimes(5);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        ninoId: "nino-id",
        actorSocialId: "actor-id",
        fechaProgramada: new Date("2026-05-10"),
        fechaEjecucion: new Date("2026-05-10T10:00:00.000Z"),
        estado: "EJECUTADA",
        peso: 6.5,
        hierroEntregado: true,
        consejeriaBrindada: true,
        alertas: "Ninguna",
        comentarios: "El niño se encuentra con buen peso y talla. Madre receptiva a consejería.",
      },
    });
  });

  it("skips creating visitas that already exist", async () => {
    const findFirstMuni = vi.fn().mockResolvedValue({ id: "muni-id" });
    const findFirstNino = vi.fn().mockResolvedValue({ id: "nino-id" });
    const findFirstActor = vi.fn().mockResolvedValue({ id: "actor-id" });
    const findFirstVisita = vi.fn().mockResolvedValue({ id: "visita-id" });
    const create = vi.fn().mockResolvedValue({ id: "visita-id" });

    const createdCount = await seedVisitasDomiciliarias({
      visitas: { findFirst: findFirstVisita, create } as any,
      municipalidades: { findFirst: findFirstMuni } as any,
      ninos: { findFirst: findFirstNino } as any,
      actoresSociales: { findFirst: findFirstActor } as any,
    });

    expect(createdCount).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});
