import { requireAuth } from "../../shared/auth.middleware.js";
import { prisma } from "../../shared/prisma.js";
import { PrismaVisitasRepository } from "./visitas.repository.js";
import { createVisitasRouter } from "./visitas.routes.js";
import { VisitasService } from "./visitas.service.js";

export function createDefaultVisitasRouter() {
  return createVisitasRouter(
    new VisitasService(new PrismaVisitasRepository(prisma)),
    requireAuth()
  );
}
