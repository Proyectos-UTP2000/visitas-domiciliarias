export type AuthRole = "ADMIN_GENERAL" | "ADMIN_MUNICIPAL" | "SUPERVISOR" | "PERSONAL_SALUD" | "ACTOR_SOCIAL";

export type AuthUser = {
  id: string;
  username: string;
  rol: AuthRole;
  municipalidadId: string | null;
  actorSocialId: string | null;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type LoginResponse = AuthSession;
