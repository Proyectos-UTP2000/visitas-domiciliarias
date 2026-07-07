import { requireAuth } from "../../shared/auth.middleware.js";
import { prisma } from "../../shared/prisma.js";
import { PrismaSectoresRepository } from "./sectores.repository.js";
import { createSectoresRouter } from "./sectores.routes.js";
import { SectoresService } from "./sectores.service.js";

export function createDefaultSectoresRouter() {
  const baseRepo = new PrismaSectoresRepository(prisma);

  const repository = Object.assign(baseRepo, {
    findCentroPobladoById: async (id: string) => {
      return prisma.centroPoblado.findFirst({
        where: { id, archivado: false },
        select: { id: true },
      });
    },
  });

  return createSectoresRouter(
    new SectoresService(repository),
    requireAuth(),
  );
}
