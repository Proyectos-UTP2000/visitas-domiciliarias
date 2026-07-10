import { describe, expect, it, vi, beforeEach } from "vitest";
import { NinosService } from "./ninos.service.js";
import { HttpError } from "../../shared/http-error.js";
import type { NinosRepository } from "./ninos.types.js";

const mockRepository = {
  list: vi.fn(),
  findById: vi.fn(),
  findByDni: vi.fn(),
  findByCnv: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setActivo: vi.fn(),
  archive: vi.fn(),
  findResponsableById: vi.fn(),
  findSectorById: vi.fn(),
  findActorSocialById: vi.fn(),
  getAsignacionActiva: vi.fn(),
  crearAsignacion: vi.fn(),
  desactivarAsignacionActiva: vi.fn(),
  listHistorialAsignaciones: vi.fn(),
};

const service = new NinosService(
  mockRepository as unknown as NinosRepository
);

describe("NinosService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("create", () => {
    it("throws error when duplicate DNI is registered", async () => {
      mockRepository.findByDni.mockResolvedValue({ id: "nino-1" });
      const payload = {
        municipalidadId: "muni-1",
        responsableId: "resp-1",
        dni: "76543210",
        nombres: "Gael",
        apellidos: "Quispe",
        sexo: "MASCULINO" as const,
        fechaNac: "2026-01-01",
        direccion: "Av. Las Flores",
      };

      await expect(service.create(payload)).rejects.toThrow(
        new HttpError(409, "Ya existe un niño registrado con ese DNI en esta municipalidad")
      );
    });

    it("throws error when duplicate CNV is registered", async () => {
      mockRepository.findByDni.mockResolvedValue(null);
      mockRepository.findByCnv.mockResolvedValue({ id: "nino-2" });
      const payload = {
        municipalidadId: "muni-1",
        responsableId: "resp-1",
        cnv: "CNV-999",
        nombres: "Gael",
        apellidos: "Quispe",
        sexo: "MASCULINO" as const,
        fechaNac: "2026-01-01",
        direccion: "Av. Las Flores",
      };

      await expect(service.create(payload)).rejects.toThrow(
        new HttpError(409, "Ya existe un niño registrado con ese CNV en esta municipalidad")
      );
    });

    it("throws error if responsable does not exist", async () => {
      mockRepository.findByDni.mockResolvedValue(null);
      mockRepository.findByCnv.mockResolvedValue(null);
      mockRepository.findResponsableById.mockResolvedValue(null);

      const payload = {
        municipalidadId: "muni-1",
        responsableId: "resp-1",
        dni: "76543210",
        nombres: "Gael",
        apellidos: "Quispe",
        sexo: "MASCULINO" as const,
        fechaNac: "2026-01-01",
        direccion: "Av. Las Flores",
      };

      await expect(service.create(payload)).rejects.toThrow(
        new HttpError(404, "Responsable no encontrado")
      );
    });

    it("throws error if responsable belongs to different municipalidad", async () => {
      mockRepository.findByDni.mockResolvedValue(null);
      mockRepository.findByCnv.mockResolvedValue(null);
      mockRepository.findResponsableById.mockResolvedValue({ id: "resp-1", municipalidadId: "muni-2" });

      const payload = {
        municipalidadId: "muni-1",
        responsableId: "resp-1",
        dni: "76543210",
        nombres: "Gael",
        apellidos: "Quispe",
        sexo: "MASCULINO" as const,
        fechaNac: "2026-01-01",
        direccion: "Av. Las Flores",
      };

      await expect(service.create(payload)).rejects.toThrow(
        new HttpError(400, "El responsable no pertenece a la municipalidad indicada")
      );
    });
  });

  describe("asignarActorSocial", () => {
    it("throws error if nino does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.asignarActorSocial("nino-1", "actor-1", "user-1", "Reasignacion")
      ).rejects.toThrow(new HttpError(404, "Niño no encontrado"));
    });

    it("throws error if actor social does not exist", async () => {
      mockRepository.findById.mockResolvedValue({ id: "nino-1", municipalidadId: "muni-1" });
      mockRepository.findActorSocialById.mockResolvedValue(null);

      await expect(
        service.asignarActorSocial("nino-1", "actor-1", "user-1", "Reasignacion")
      ).rejects.toThrow(new HttpError(404, "Actor social no encontrado"));
    });

    it("throws error if actor social belongs to other municipalidad", async () => {
      mockRepository.findById.mockResolvedValue({ id: "nino-1", municipalidadId: "muni-1" });
      mockRepository.findActorSocialById.mockResolvedValue({
        id: "actor-1",
        municipalidadId: "muni-2",
        activo: true,
      });

      await expect(
        service.asignarActorSocial("nino-1", "actor-1", "user-1", "Reasignacion")
      ).rejects.toThrow(new HttpError(400, "El actor social pertenece a otra municipalidad"));
    });

    it("throws error if actor social is inactive", async () => {
      mockRepository.findById.mockResolvedValue({ id: "nino-1", municipalidadId: "muni-1" });
      mockRepository.findActorSocialById.mockResolvedValue({
        id: "actor-1",
        municipalidadId: "muni-1",
        activo: false,
      });

      await expect(
        service.asignarActorSocial("nino-1", "actor-1", "user-1", "Reasignacion")
      ).rejects.toThrow(new HttpError(400, "No se puede asignar un niño a un actor social inactivo"));
    });

    it("creates assignment successfully", async () => {
      const mockNino = { id: "nino-1", municipalidadId: "muni-1" };
      mockRepository.findById.mockResolvedValue(mockNino);
      mockRepository.findActorSocialById.mockResolvedValue({
        id: "actor-1",
        municipalidadId: "muni-1",
        activo: true,
      });
      mockRepository.crearAsignacion.mockResolvedValue({ id: "asig-1" });

      const res = await service.asignarActorSocial("nino-1", "actor-1", "user-1", "Nueva asignación");
      expect(res).toEqual({ id: "asig-1" });
      expect(mockRepository.crearAsignacion).toHaveBeenCalledWith(
        "nino-1",
        "actor-1",
        "user-1",
        "Nueva asignación"
      );
    });
  });
});
