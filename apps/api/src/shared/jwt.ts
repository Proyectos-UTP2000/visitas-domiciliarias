import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "./env.js";
import { HttpError } from "./http-error.js";

export type AuthRole = "ADMIN_GENERAL" | "ADMIN_MUNICIPAL" | "SUPERVISOR" | "PERSONAL_SALUD" | "ACTOR_SOCIAL";

export type AccessTokenPayload = {
  userId: string;
  rol: AuthRole;
  municipalidadId: string | null;
  actorSocialId: string | null;
};

type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>;

type SignAccessTokenOptions = {
  secret?: string;
  expiresIn?: JwtExpiresIn;
};

type VerifyAccessTokenOptions = {
  secret?: string;
};

export function signAccessToken(
  payload: AccessTokenPayload,
  options: SignAccessTokenOptions = {},
): string {
  const signOptions: SignOptions = {
    expiresIn: options.expiresIn ?? (env.JWT_ACCESS_EXPIRES_IN as JwtExpiresIn),
  };

  return jwt.sign(
    payload,
    options.secret ?? env.JWT_ACCESS_SECRET,
    signOptions,
  );
}

export function verifyAccessToken(
  token: string,
  options: VerifyAccessTokenOptions = {},
): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, options.secret ?? env.JWT_ACCESS_SECRET);

    if (!isAccessTokenPayload(payload)) {
      throw new Error("Invalid payload");
    }

    return payload;
  } catch {
    throw new HttpError(401, "Token inválido");
  }
}

function isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Partial<AccessTokenPayload>;

  return (
    typeof candidate.userId === "string" &&
    isAuthRole(candidate.rol) &&
    (typeof candidate.municipalidadId === "string" ||
      candidate.municipalidadId === null) &&
    (typeof candidate.actorSocialId === "string" ||
      candidate.actorSocialId === null)
  );
}

function isAuthRole(value: unknown): value is AuthRole {
  return (
    value === "ADMIN_GENERAL" ||
    value === "ADMIN_MUNICIPAL" ||
    value === "SUPERVISOR" ||
    value === "PERSONAL_SALUD" ||
    value === "ACTOR_SOCIAL"
  );
}
