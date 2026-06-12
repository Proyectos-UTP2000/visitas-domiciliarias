import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../../shared/http-error.js";
import { AuthService } from "./auth.service.js";
import type { AuthUserRecord, AuthUserRepository } from "./auth.types.js";

const activeAdmin: AuthUserRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "admin",
  passwordHash: "hash-admin",
  rol: "ADMIN_GENERAL",
  activo: true,
  municipalidadId: null,
  actorSocialId: null,
};

function createService(user: AuthUserRecord | null, passwordMatches = true) {
  const findByUsername = vi.fn().mockResolvedValue(user);
  const verifyPassword = vi.fn().mockResolvedValue(passwordMatches);
  const signAccessToken = vi.fn().mockReturnValue("signed-token");

  const service = new AuthService({
    users: { findByUsername },
    password: { verify: verifyPassword },
    tokens: { signAccessToken },
  });

  return { service, findByUsername, verifyPassword, signAccessToken };
}

describe("AuthService", () => {
  it("returns an access token and user summary for valid credentials", async () => {
    const { service, signAccessToken } = createService(activeAdmin);

    const result = await service.login({
      username: "admin",
      password: "secret",
    });

    expect(result).toEqual({
      accessToken: "signed-token",
      user: {
        id: activeAdmin.id,
        username: "admin",
        rol: "ADMIN_GENERAL",
        municipalidadId: null,
        actorSocialId: null,
      },
    });
    expect(signAccessToken).toHaveBeenCalledWith({
      userId: activeAdmin.id,
      rol: "ADMIN_GENERAL",
      municipalidadId: null,
      actorSocialId: null,
    });
  });

  it("rejects an unknown username with a generic credentials error", async () => {
    const { service } = createService(null);

    await expect(
      service.login({ username: "nadie", password: "secret" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Credenciales inválidas",
    } satisfies Partial<HttpError>);
  });

  it("rejects an incorrect password with a generic credentials error", async () => {
    const { service } = createService(activeAdmin, false);

    await expect(
      service.login({ username: "admin", password: "mala" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Credenciales inválidas",
    } satisfies Partial<HttpError>);
  });

  it("rejects inactive users", async () => {
    const { service } = createService({ ...activeAdmin, activo: false });

    await expect(
      service.login({ username: "admin", password: "secret" }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Usuario inactivo",
    } satisfies Partial<HttpError>);
  });

  describe("password recovery flow", () => {
    const mockUserRepository = {
      findByUsername: vi.fn(),
      findUserByEmail: vi.fn(),
      createResetToken: vi.fn(),
      findResetTokenByHash: vi.fn(),
      markResetTokenAsUsed: vi.fn(),
      updatePassword: vi.fn(),
    };
    const mockMailer = {
      sendPasswordResetEmail: vi.fn(),
    };
    const recoveryService = new AuthService({
      users: mockUserRepository as unknown as AuthUserRepository,
      password: { verify: vi.fn() },
      tokens: { signAccessToken: vi.fn() },
      mailer: mockMailer,
    });

    it("throws 404 if email is not associated with any actor social", async () => {
      mockUserRepository.findUserByEmail.mockResolvedValue(null);
      await expect(
        recoveryService.forgotPassword({ email: "notfound@gmail.com" }),
      ).rejects.toThrow(new HttpError(404, "Correo electrónico no registrado"));
    });

    it("verifies reset token validation throws 400 for expired tokens", async () => {
      const expiredTokenRecord = {
        id: "tok-1",
        usuarioId: "usr-1",
        tokenHash: "hashed-token",
        expiresAt: new Date(Date.now() - 10000), // expired
        usedAt: null,
        createdAt: new Date(),
      };
      mockUserRepository.findResetTokenByHash.mockResolvedValue(
        expiredTokenRecord,
      );
      await expect(
        recoveryService.resetPassword({
          token: "raw-token",
          password: "NewStrongPassword1!",
        }),
      ).rejects.toThrow(new HttpError(400, "Token inválido o expirado"));
    });
  });
});
