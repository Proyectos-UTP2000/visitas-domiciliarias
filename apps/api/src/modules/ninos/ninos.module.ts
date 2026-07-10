import { requireAuth } from "../../shared/auth.middleware.js";
import { prisma } from "../../shared/prisma.js";
import { PrismaNinosRepository } from "./ninos.repository.js";
import { createNinosRouter } from "./ninos.routes.js";
import { NinosService } from "./ninos.service.js";

export function createDefaultNinosRouter() {
  const extendedRepository = Object.assign(new PrismaNinosRepository(prisma), {
    findResponsableById: async (id: string) => {
      return prisma.responsable.findUnique({
        where: { id },
        select: { id: true, municipalidadId: true },
      });
    },
    findSectorById: async (id: string) => {
      return prisma.sector.findUnique({
        where: { id },
        select: { id: true, municipalidadId: true },
      });
    },
    findActorSocialById: async (id: string) => {
      return prisma.actorSocial.findUnique({
        where: { id },
        select: { id: true, municipalidadId: true, activo: true },
      });
    },
  });

  return createNinosRouter(
    new NinosService(extendedRepository),
    requireAuth()
  );
}
