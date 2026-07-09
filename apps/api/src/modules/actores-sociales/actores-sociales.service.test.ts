import { describe, expect, it, vi } from "vitest";
import { ActoresSocialesService } from "./actores-sociales.service.js";
import { HttpError } from "../../shared/http-error.js";
import type { ActoresSocialesRepository } from "./actores-sociales.types.js";

const mockRepository = {
  list: vi.fn(),
  findById: vi.fn(),
  findByDni: vi.fn(),
  findByUsername: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setActivo: vi.fn(),
  setEstado: vi.fn(),
  archive: vi.fn(),
  delete: vi.fn(),
  findMunicipalidadById: vi.fn(),
  findTipoActorById: vi.fn(),
  findGrupoById: vi.fn(),
  findEntidadById: vi.fn(),
  findActiveBySector: vi.fn(),
};

const service = new ActoresSocialesService(
  mockRepository as unknown as ActoresSocialesRepository,
);

describe("ActoresSocialesService", () => {
  it("throws error when creating with duplicate DNI", async () => {
    mockRepository.findByDni.mockResolvedValue({ id: "actor-1" });
    const payload = {
      municipalidadId: "mun-1",
      tipoActorSocialId: "tipo-1",
      grupoTrabajoId: "grupo-1",
      dni: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      direccion: "Calle Falsa 123",
      fechaNac: "1990-01-01",
      email: "juan@gmail.com",
      celular: "987654321",
      idiomaOrigen: "ESPAÑOL",
      gradoInstruccion: "SUPERIOR",
      username: "juanp",
      password: "password",
    };
    await expect(service.create(payload)).rejects.toThrow(
      new HttpError(409, "Ya existe un actor social con ese DNI en esta municipalidad")
    );
  });

  it("throws error when creating with duplicate username", async () => {
    mockRepository.findByDni.mockResolvedValue(null);
    mockRepository.findByUsername.mockResolvedValue(true);
    const payload = {
      municipalidadId: "mun-1",
      tipoActorSocialId: "tipo-1",
      grupoTrabajoId: "grupo-1",
      dni: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      direccion: "Calle Falsa 123",
      fechaNac: "1990-01-01",
      email: "juan@gmail.com",
      celular: "987654321",
      idiomaOrigen: "ESPAÑOL",
      gradoInstruccion: "SUPERIOR",
      username: "juanp",
      password: "password",
    };
    await expect(service.create(payload)).rejects.toThrow(
      new HttpError(409, "El nombre de usuario ya está registrado en el sistema")
    );
  });

  it("throws error when creating and sector is already assigned to active actor", async () => {
    mockRepository.findByDni.mockResolvedValue(null);
    mockRepository.findByUsername.mockResolvedValue(false);
    mockRepository.findMunicipalidadById.mockResolvedValue({ id: "mun-1" });
    mockRepository.findTipoActorById.mockResolvedValue({ id: "tipo-1" });
    mockRepository.findGrupoById.mockResolvedValue({ id: "grupo-1", municipalidadId: "mun-1" });
    mockRepository.findActiveBySector.mockResolvedValue({
      id: "actor-2",
      nombres: "Maria",
      apellidos: "Gomez",
    });

    const payload = {
      municipalidadId: "mun-1",
      tipoActorSocialId: "tipo-1",
      grupoTrabajoId: "grupo-1",
      dni: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      direccion: "Calle Falsa 123",
      fechaNac: "1990-01-01",
      email: "juan@gmail.com",
      celular: "987654321",
      idiomaOrigen: "ESPAÑOL",
      gradoInstruccion: "SUPERIOR",
      username: "juanp",
      password: "password",
      sectoresIds: ["sector-1"],
    };

    await expect(service.create(payload)).rejects.toThrow(
      new HttpError(400, "El sector/manzana ya se encuentra asignado al actor social activo: Maria Gomez")
    );
  });

  it("throws error when updating and sector is already assigned to another active actor", async () => {
    mockRepository.findById.mockResolvedValue({ id: "actor-1", municipalidadId: "mun-1" });
    mockRepository.findTipoActorById.mockResolvedValue({ id: "tipo-1" });
    mockRepository.findGrupoById.mockResolvedValue({ id: "grupo-1", municipalidadId: "mun-1" });
    mockRepository.findActiveBySector.mockResolvedValue({
      id: "actor-2",
      nombres: "Maria",
      apellidos: "Gomez",
    });

    const payload = {
      tipoActorSocialId: "tipo-1",
      grupoTrabajoId: "grupo-1",
      email: "juan@gmail.com",
      celular: "987654321",
      direccion: "Calle Falsa 123",
      gradoInstruccion: "SUPERIOR",
      sectoresIds: ["sector-1"],
    };

    await expect(service.update("actor-1", payload)).rejects.toThrow(
      new HttpError(400, "El sector/manzana ya se encuentra asignado al actor social activo: Maria Gomez")
    );
  });
});
