import type { AccessTokenPayload, AuthRole } from "../../shared/jwt.js";

export type LoginInput = {
  username: string;
  password: string;
};

export type AuthUserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  rol: AuthRole;
  activo: boolean;
  municipalidadId: string | null;
  actorSocialId: string | null;
};

export type AuthenticatedUser = Omit<AuthUserRecord, "passwordHash" | "activo">;

export type LoginResult = {
  accessToken: string;
  user: AuthenticatedUser;
};

export type PasswordResetTokenRecord = {
  id: string;
  usuarioId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type AuthUserRepository = {
  findByUsername(username: string): Promise<AuthUserRecord | null>;
  findUserByEmail(
    email: string,
  ): Promise<{ id: string; username: string } | null>;
  createResetToken(
    usuarioId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  findResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null>;
  markResetTokenAsUsed(tokenId: string): Promise<void>;
  updatePassword(usuarioId: string, passwordHash: string): Promise<void>;
};

export type PasswordVerifier = {
  verify(password: string, passwordHash: string): Promise<boolean>;
};

export type AccessTokenSigner = {
  signAccessToken(payload: AccessTokenPayload): string;
};

export type AuthServiceDependencies = {
  users: AuthUserRepository;
  password: PasswordVerifier;
  tokens: AccessTokenSigner;
  mailer?: {
    sendPasswordResetEmail(
      email: string,
      username: string,
      token: string,
    ): Promise<void>;
  };
};
