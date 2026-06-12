import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../shared/error-handler.js";
import { createAuthRouter } from "./auth.routes.js";

let server: Server | null = null;

async function postJson(path: string, body: unknown, login = vi.fn()) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRouter({ login } as unknown as Parameters<
      typeof createAuthRouter
    >[0]),
  );
  app.use(errorHandler);

  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("No test server address");
  }

  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: (await response.json()) as unknown,
    login,
  };
}

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((error) => (error ? reject(error) : resolve()));
    server = null;
  });
});

describe("auth routes", () => {
  it("returns login response for valid credentials", async () => {
    const login = vi.fn().mockResolvedValue({
      accessToken: "signed-token",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        username: "admin",
        rol: "ADMIN_GENERAL",
        municipalidadId: null,
        actorSocialId: null,
      },
    });

    const response = await postJson(
      "/api/v1/auth/login",
      { username: "admin", password: "secret" },
      login,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: "signed-token",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        username: "admin",
        rol: "ADMIN_GENERAL",
        municipalidadId: null,
        actorSocialId: null,
      },
    });
    expect(login).toHaveBeenCalledWith({
      username: "admin",
      password: "secret",
    });
  });

  it("rejects invalid payloads before calling the service", async () => {
    const login = vi.fn();

    const response = await postJson(
      "/api/v1/auth/login",
      { username: "", password: "" },
      login,
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: "Datos de login inválidos",
    });
    expect(login).not.toHaveBeenCalled();
  });
});
