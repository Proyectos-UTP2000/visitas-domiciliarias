import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createDefaultAuthRouter } from "./modules/auth/auth.module.js";
import { createDefaultCargosMiembroGrupoRouter } from "./modules/cargos-miembro-grupo/cargos-miembro-grupo.module.js";
import { createDefaultEntidadesRouter } from "./modules/entidades/entidades.module.js";
import { createDefaultGruposTrabajoRouter } from "./modules/grupos-trabajo/grupos-trabajo.module.js";
import { createDefaultMunicipalidadesRouter } from "./modules/municipalidades/municipalidades.module.js";
import { createDefaultSectoresRouter } from "./modules/sectores/sectores.module.js";
import { createDefaultTiposActorSocialRouter } from "./modules/tipos-actor-social/tipos-actor-social.module.js";
import { createDefaultActoresSocialesRouter } from "./modules/actores-sociales/actores-sociales.module.js";
import { createDefaultDniRouter } from "./modules/dni/dni.module.js";
import { createDefaultCentrosPobladosRouter } from "./modules/centros-poblados/centros-poblados.module.js";
import { createDefaultResponsablesRouter } from "./modules/responsables/responsables.module.js";
import { createDefaultNinosRouter } from "./modules/ninos/ninos.module.js";
import { createDefaultVisitasRouter } from "./modules/visitas/visitas.module.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { errorHandler } from "./shared/error-handler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", createDefaultAuthRouter());
  app.use("/api/v1/municipalidades", createDefaultMunicipalidadesRouter());
  app.use("/api/v1/entidades", createDefaultEntidadesRouter());
  app.use("/api/v1/tipos-actor-social", createDefaultTiposActorSocialRouter());
  app.use(
    "/api/v1/cargos-miembro-grupo",
    createDefaultCargosMiembroGrupoRouter(),
  );
  app.use("/api/v1/grupos-trabajo", createDefaultGruposTrabajoRouter());
  app.use("/api/v1/sectores", createDefaultSectoresRouter());
  app.use("/api/v1/actores-sociales", createDefaultActoresSocialesRouter());
  app.use("/api/v1/centros-poblados", createDefaultCentrosPobladosRouter());
  app.use("/api/v1/dni", createDefaultDniRouter());
  app.use("/api/v1/responsables", createDefaultResponsablesRouter());
  app.use("/api/v1/ninos", createDefaultNinosRouter());
  app.use("/api/v1/visitas", createDefaultVisitasRouter());

  app.use(errorHandler);

  return app;
}
