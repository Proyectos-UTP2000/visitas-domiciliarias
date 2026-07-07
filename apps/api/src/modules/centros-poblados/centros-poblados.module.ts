import { requireAuth } from "../../shared/auth.middleware.js";
import { prisma } from "../../shared/prisma.js";
import { PrismaCentrosPobladosRepository } from "./centros-poblados.repository.js";
import { createCentrosPobladosRouter } from "./centros-poblados.routes.js";
import { CentrosPobladosService } from "./centros-poblados.service.js";

export function createDefaultCentrosPobladosRouter() {
  const baseRepo = new PrismaCentrosPobladosRepository(prisma);

  const repository = Object.assign(baseRepo, {
    findMunicipalidadById: async (id: string) => {
      return prisma.municipalidad.findFirst({
        where: { id, archivado: false },
        select: { id: true },
      });
    },
  });

  return createCentrosPobladosRouter(
    new CentrosPobladosService(repository),
    requireAuth()
  );
}
