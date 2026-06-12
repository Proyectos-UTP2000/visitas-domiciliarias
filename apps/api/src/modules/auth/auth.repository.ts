import type { PrismaClient } from "@prisma/client";
import type { AuthUserRecord, PasswordResetTokenRecord } from "./auth.types.js";

export class PrismaAuthUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUsername(username: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.usuario.findUnique({
      where: { username },
      include: {
        actorSocial: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      rol: user.rol,
      activo: user.activo,
      municipalidadId: user.municipalidadId,
      actorSocialId: user.actorSocial?.id ?? null,
    };
  }

  async findUserByEmail(
    email: string,
  ): Promise<{ id: string; username: string } | null> {
    const actor = await this.prisma.actorSocial.findFirst({
      where: { email, deletedAt: null, archivado: false },
      select: { usuario: { select: { id: true, username: true } } },
    });

    if (!actor || !actor.usuario) {
      return null;
    }

    return {
      id: actor.usuario.id,
      username: actor.usuario.username,
    };
  }

  async createResetToken(
    usuarioId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        usuarioId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null> {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash },
    });
    return record as unknown as PasswordResetTokenRecord | null;
  }

  async markResetTokenAsUsed(tokenId: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async updatePassword(usuarioId: string, passwordHash: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { passwordHash },
    });
  }
}
