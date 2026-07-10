import { requireAuth } from "../../shared/auth.middleware.js";
import { prisma } from "../../shared/prisma.js";
import { ReportesRepository } from "./reportes.repository.js";
import { ReportesService } from "./reportes.service.js";
import { createReportesRouter } from "./reportes.routes.js";

export function createDefaultReportesRouter() {
  return createReportesRouter(
    new ReportesService(new ReportesRepository(prisma)),
    requireAuth()
  );
}
