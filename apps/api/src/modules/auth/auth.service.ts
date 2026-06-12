import crypto from "node:crypto";
import { HttpError } from "../../shared/http-error.js";
import { hashPassword } from "../../shared/password.js";
import type {
  AuthServiceDependencies,
  LoginInput,
  LoginResult,
} from "./auth.types.js";

export class AuthService {
  constructor(private readonly dependencies: AuthServiceDependencies) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.dependencies.users.findByUsername(input.username);

    if (!user) {
      throw new HttpError(401, "Credenciales inválidas");
    }

    const passwordMatches = await this.dependencies.password.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new HttpError(401, "Credenciales inválidas");
    }

    if (!user.activo) {
      throw new HttpError(403, "Usuario inactivo");
    }

    const tokenPayload = {
      userId: user.id,
      rol: user.rol,
      municipalidadId: user.municipalidadId,
      actorSocialId: user.actorSocialId,
    };

    return {
      accessToken: this.dependencies.tokens.signAccessToken(tokenPayload),
      user: {
        id: user.id,
        username: user.username,
        rol: user.rol,
        municipalidadId: user.municipalidadId,
        actorSocialId: user.actorSocialId,
      },
    };
  }

  async forgotPassword(input: { email: string }): Promise<void> {
    const user = await this.dependencies.users.findUserByEmail(input.email);
    if (!user) {
      throw new HttpError(404, "Correo electrónico no registrado");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.dependencies.users.createResetToken(
      user.id,
      tokenHash,
      expiresAt,
    );

    if (this.dependencies.mailer) {
      await this.dependencies.mailer.sendPasswordResetEmail(
        input.email,
        user.username,
        rawToken,
      );
    }
  }

  async resetPassword(input: {
    token: string;
    password: string;
  }): Promise<void> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(input.token)
      .digest("hex");
    const resetRecord =
      await this.dependencies.users.findResetTokenByHash(tokenHash);

    if (
      !resetRecord ||
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt < new Date()
    ) {
      throw new HttpError(400, "Token inválido o expirado");
    }

    const passwordHash = await hashPassword(input.password);
    await this.dependencies.users.updatePassword(
      resetRecord.usuarioId,
      passwordHash,
    );
    await this.dependencies.users.markResetTokenAsUsed(resetRecord.id);
  }
}
