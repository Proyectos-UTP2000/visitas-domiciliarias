import { Router, type RequestHandler } from "express";
import {
  activoPayloadSchema,
  tipoActorSocialPayloadSchema,
} from "./tipos-actor-social.schemas.js";
import type { TiposActorSocialService } from "./tipos-actor-social.service.js";
export function createTiposActorSocialRouter(
  service: TiposActorSocialService,
  auth: RequestHandler,
) {
  const router = Router();
  router.use(auth);
  router.get("/", async (_req, res, next) => {
    try {
      res.json(await service.list());
    } catch (e) {
      next(e);
    }
  });
  router.post("/", async (req, res, next) => {
    const p = tipoActorSocialPayloadSchema.safeParse(req.body);
    if (!p.success) {
      res
        .status(400)
        .json({
          message: "Datos de tipo de actor social inválidos",
          details: p.error.flatten().fieldErrors,
        });
      return;
    }
    try {
      res.status(201).json(await service.create(p.data));
    } catch (e) {
      next(e);
    }
  });
  router.put("/:id", async (req, res, next) => {
    const p = tipoActorSocialPayloadSchema.safeParse(req.body);
    if (!p.success) {
      res
        .status(400)
        .json({
          message: "Datos de tipo de actor social inválidos",
          details: p.error.flatten().fieldErrors,
        });
      return;
    }
    try {
      res.json(await service.update(req.params.id, p.data));
    } catch (e) {
      next(e);
    }
  });
  router.patch("/:id/activo", async (req, res, next) => {
    const p = activoPayloadSchema.safeParse(req.body);
    if (!p.success) {
      res
        .status(400)
        .json({
          message: "Estado de tipo de actor social inválido",
          details: p.error.flatten().fieldErrors,
        });
      return;
    }
    try {
      res.json(await service.setActivo(req.params.id, p.data.activo));
    } catch (e) {
      next(e);
    }
  });
  router.patch("/:id/archivar", async (req, res, next) => {
    try {
      res.json(await service.archive(req.params.id));
    } catch (e) {
      next(e);
    }
  });
  return router;
}
