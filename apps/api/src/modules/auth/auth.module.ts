import { signAccessToken } from "../../shared/jwt.js";
import { verifyPassword } from "../../shared/password.js";
import { prisma } from "../../shared/prisma.js";
import { MailerService } from "../../shared/mailer.js";
import { PrismaAuthUserRepository } from "./auth.repository.js";
import { createAuthRouter } from "./auth.routes.js";
import { AuthService } from "./auth.service.js";

export function createDefaultAuthRouter() {
  const service = new AuthService({
    users: new PrismaAuthUserRepository(prisma),
    password: { verify: verifyPassword },
    tokens: { signAccessToken },
    mailer: new MailerService(),
  });

  return createAuthRouter(service);
}
