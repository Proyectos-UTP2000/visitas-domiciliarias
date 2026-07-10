import { requireAuth } from "../../shared/auth.middleware.js";
import { prisma } from "../../shared/prisma.js";
import { PrismaResponsablesRepository } from "./responsables.repository.js";
import { createResponsablesRouter } from "./responsables.routes.js";
import { ResponsablesService } from "./responsables.service.js";

export function createDefaultResponsablesRouter() {
  return createResponsablesRouter(
    new ResponsablesService(new PrismaResponsablesRepository(prisma)),
    requireAuth()
  );
}
