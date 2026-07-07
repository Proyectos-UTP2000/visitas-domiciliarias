import { describe, expect, it, vi, beforeEach } from "vitest";
import { DniService } from "./dni.service.js";

describe("DniService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data on successful query", async () => {
    const mockFetch = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          datos: {
            dni: "99999999",
            nombres: "YOVANA LISBETH",
            ape_paterno: "MAMANI",
            ape_materno: "FAIJO",
          },
        }),
    } as any);

    const service = new DniService();
    const result = await service.consultarDni("99999999");

    expect(result).toMatchObject({
      dni: "99999999",
      nombres: "YOVANA LISBETH",
    });
    expect(mockFetch).toHaveBeenCalled();
  });

  it("throws error if DNI format is invalid", async () => {
    const service = new DniService();
    await expect(service.consultarDni("123")).rejects.toMatchObject({
      statusCode: 400,
      message: "El DNI debe tener exactamente 8 dígitos numéricos",
    });
  });

  it("throws error if API returns failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          message: "DNI no encontrado",
        }),
    } as any);

    const service = new DniService();
    await expect(service.consultarDni("00000000")).rejects.toMatchObject({
      statusCode: 400,
      message: "DNI no encontrado",
    });
  });

  it("throws 502 error if API response is not ok", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as any);

      const service = new DniService();
      await expect(service.consultarDni("99999999")).rejects.toMatchObject({
        statusCode: 502,
        message: "Error al consultar el servicio externo de DNI (código: 401)",
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
