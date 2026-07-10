import { describe, expect, it, vi, beforeEach } from "vitest";
import { VisitasService } from "./visitas.service.js";
import { HttpError } from "../../shared/http-error.js";
import type { VisitasRepository } from "./visitas.types.js";

const mockRepository = {
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  updateEstado: vi.fn(),
  findNinoById: vi.fn(),
  findActorById: vi.fn(),
  reprogramarVisita: vi.fn(),
};

const service = new VisitasService(
  mockRepository as unknown as VisitasRepository
);

describe("VisitasService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("programar", () => {
    it("throws error if nino does not exist", async () => {
      mockRepository.findNinoById.mockResolvedValue(null);

      const payload = {
        ninoId: "nino-1",
        actorSocialId: "actor-1",
        fechaProgramada: "2026-10-10",
      };

      await expect(service.programar(payload)).rejects.toThrow(
        new HttpError(404, "Niño no encontrado")
      );
    });

    it("throws error if nino is inactive", async () => {
      mockRepository.findNinoById.mockResolvedValue({ id: "nino-1", activo: false, municipalidadId: "muni-1" });

      const payload = {
        ninoId: "nino-1",
        actorSocialId: "actor-1",
        fechaProgramada: "2026-10-10",
      };

      await expect(service.programar(payload)).rejects.toThrow(
        new HttpError(400, "El niño debe estar activo para programar visitas")
      );
    });

    it("throws error if actor social does not exist", async () => {
      mockRepository.findNinoById.mockResolvedValue({ id: "nino-1", activo: true, municipalidadId: "muni-1" });
      mockRepository.findActorById.mockResolvedValue(null);

      const payload = {
        ninoId: "nino-1",
        actorSocialId: "actor-1",
        fechaProgramada: "2026-10-10",
      };

      await expect(service.programar(payload)).rejects.toThrow(
        new HttpError(404, "Actor social no encontrado")
      );
    });

    it("throws error if actor is from a different municipalidad", async () => {
      mockRepository.findNinoById.mockResolvedValue({ id: "nino-1", activo: true, municipalidadId: "muni-1" });
      mockRepository.findActorById.mockResolvedValue({ id: "actor-1", activo: true, municipalidadId: "muni-2" });

      const payload = {
        ninoId: "nino-1",
        actorSocialId: "actor-1",
        fechaProgramada: "2026-10-10",
      };

      await expect(service.programar(payload)).rejects.toThrow(
        new HttpError(400, "El niño y el actor social deben pertenecer a la misma municipalidad")
      );
    });

    it("throws error if there is already a planned visit on the same day", async () => {
      mockRepository.findNinoById.mockResolvedValue({ id: "nino-1", activo: true, municipalidadId: "muni-1" });
      mockRepository.findActorById.mockResolvedValue({ id: "actor-1", activo: true, municipalidadId: "muni-1" });
      mockRepository.list.mockResolvedValue([
        {
          id: "v-1",
          fechaProgramada: new Date("2026-10-10T00:00:00.000Z"),
          estado: "PROGRAMADA",
        },
      ]);

      const payload = {
        ninoId: "nino-1",
        actorSocialId: "actor-1",
        fechaProgramada: "2026-10-10",
      };

      await expect(service.programar(payload)).rejects.toThrow(
        new HttpError(409, "Ya existe una visita programada para este niño en el mismo día")
      );
    });
  });

  describe("ejecutar", () => {
    it("throws error if visit is not in planned or rescheduled state", async () => {
      mockRepository.findById.mockResolvedValue({ id: "v-1", estado: "EJECUTADA" });

      const payload = {
        fechaEjecucion: "2026-10-10",
        peso: 8.5,
        hierroEntregado: true,
        consejeriaBrindada: true,
      };

      await expect(service.ejecutar("v-1", payload)).rejects.toThrow(
        new HttpError(400, "No se puede ejecutar una visita en estado EJECUTADA")
      );
    });

    it("saves visit execution successfully", async () => {
      mockRepository.findById.mockResolvedValue({ id: "v-1", estado: "PROGRAMADA" });
      mockRepository.updateEstado.mockResolvedValue({ id: "v-1", estado: "EJECUTADA" });

      const payload = {
        fechaEjecucion: "2026-10-10",
        peso: 8.5,
        hierroEntregado: true,
        consejeriaBrindada: true,
        alertas: "",
        comentarios: "Todo bien",
      };

      const res = await service.ejecutar("v-1", payload);
      expect(res.estado).toBe("EJECUTADA");
      expect(mockRepository.updateEstado).toHaveBeenCalledWith("v-1", "EJECUTADA", {
        fechaEjecucion: new Date("2026-10-10"),
        peso: 8.5,
        hierroEntregado: true,
        consejeriaBrindada: true,
        alertas: null,
        comentarios: "Todo bien",
        tipoRegistro: null,
        latitud: null,
        longitud: null,
        evidenciaUrl: null,
      });
    });
  });
});
