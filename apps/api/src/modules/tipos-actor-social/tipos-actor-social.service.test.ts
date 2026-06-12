import { describe, expect, it, vi } from "vitest";
import { TiposActorSocialService } from "./tipos-actor-social.service.js";

describe("TiposActorSocialService", () => {
  it("creates an active non-archived actor social type when codigo is unique", async () => {
    const findByCodigo = vi.fn().mockResolvedValue(null);
    const create = vi
      .fn()
      .mockResolvedValue({
        id: "tas-1",
        tipoActor: "Actor social",
        tarifaRural: 12.5,
        tarifaUrbana: 10,
        orden: 1,
        codigo: "001",
        activo: true,
        archivado: false,
      });
    const service = new TiposActorSocialService({
      list: vi.fn(),
      findById: vi.fn(),
      findByCodigo,
      create,
      update: vi.fn(),
      setActivo: vi.fn(),
      archive: vi.fn(),
    });

    const result = await service.create({
      tipoActor: "Actor social",
      tarifaRural: 12.5,
      tarifaUrbana: 10,
      orden: 1,
      codigo: "001",
    });

    expect(result).toMatchObject({
      id: "tas-1",
      activo: true,
      archivado: false,
    });
    expect(create).toHaveBeenCalledWith({
      tipoActor: "Actor social",
      tarifaRural: 12.5,
      tarifaUrbana: 10,
      orden: 1,
      codigo: "001",
      activo: true,
      archivado: false,
    });
  });

  it("archives an existing actor social type", async () => {
    const archive = vi.fn().mockResolvedValue({
      id: "tas-1",
      tipoActor: "Actor social",
      tarifaRural: 12.5,
      tarifaUrbana: 10,
      orden: 1,
      codigo: "001",
      activo: true,
      archivado: true,
    });
    const service = new TiposActorSocialService({
      list: vi.fn(),
      findById: vi.fn().mockResolvedValue({ id: "tas-1" }),
      findByCodigo: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setActivo: vi.fn(),
      archive,
    });

    const result = await service.archive("tas-1");

    expect(result).toMatchObject({ id: "tas-1", archivado: true });
    expect(archive).toHaveBeenCalledWith("tas-1");
  });
});
