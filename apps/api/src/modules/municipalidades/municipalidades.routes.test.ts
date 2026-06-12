import express from "express";
import type { RequestHandler } from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../shared/error-handler.js";
import { createMunicipalidadesRouter } from "./municipalidades.routes.js";

let server: Server | null = null;
const auth: RequestHandler = (_req, _res, next) => next();

async function requestJson(
  method: string,
  path: string,
  body: unknown,
  service: Parameters<typeof createMunicipalidadesRouter>[0],
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/municipalidades",
    createMunicipalidadesRouter(service, auth),
  );
  app.use(errorHandler);
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No address");
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve();
    server.close((error) => (error ? reject(error) : resolve()));
    server = null;
  });
});

describe("municipalidades routes", () => {
  it("lists municipalidades", async () => {
    const service = {
      list: vi.fn().mockResolvedValue([{ id: "mun-1", nombre: "Lima" }]),
    };
    const response = await requestJson(
      "GET",
      "/api/v1/municipalidades",
      undefined,
      service,
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "mun-1", nombre: "Lima" }]);
  });

  it("validates create payload", async () => {
    const service = { create: vi.fn() };
    const response = await requestJson(
      "POST",
      "/api/v1/municipalidades",
      { ubigeo: "1" },
      service,
    );
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: "Datos de municipalidad inválidos",
    });
    expect(service.create).not.toHaveBeenCalled();
  });

  it("creates municipalidad with valid payload", async () => {
    const payload = {
      ubigeo: "150101",
      departamento: "Lima",
      provincia: "Lima",
      distrito: "Lima",
      codigo: "001",
      nombre: "Municipalidad de Lima",
      tipo: "PROVINCIAL",
      prioridad: 1,
    };
    const service = {
      create: vi.fn().mockResolvedValue({
        id: "mun-1",
        ...payload,
        activo: true,
        archivado: false,
      }),
    };
    const response = await requestJson(
      "POST",
      "/api/v1/municipalidades",
      payload,
      service,
    );
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: "mun-1",
      nombre: "Municipalidad de Lima",
    });
    expect(service.create).toHaveBeenCalledWith(payload);
  });
});
