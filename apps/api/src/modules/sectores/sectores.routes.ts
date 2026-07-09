import { Router, type RequestHandler } from "express";
import {
  activoPayloadSchema,
  sectorPayloadSchema,
} from "./sectores.schemas.js";
import type { SectoresService } from "./sectores.service.js";
import type { AuthenticatedRequest } from "../../shared/authenticated-request.js";

export function createSectoresRouter(
  service: SectoresService,
  auth: RequestHandler,
) {
  const router = Router();
  router.use(auth);

  router.get("/", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      if (rol === "ADMIN_MUNICIPAL") {
        res.json(await service.list(municipalidadId));
      } else {
        const queryMun = req.query.municipalidadId as string | undefined;
        res.json(await service.list(queryMun || null));
      }
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = sectorPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de sector inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol === "ADMIN_MUNICIPAL" && parsed.data.municipalidadId !== municipalidadId) {
      res.status(403).json({
        message: "No tiene permiso para crear un sector en otra municipalidad",
      });
      return;
    }

    try {
      res.status(201).json(await service.create(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    const parsed = sectorPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de sector inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar un sector de otra municipalidad",
        });
        return;
      }
      res.json(await service.update(req.params.id, parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/activo", async (req, res, next) => {
    const parsed = activoPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Estado de sector inválido",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar este sector",
        });
        return;
      }
      res.json(await service.setActivo(req.params.id, parsed.data.activo));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/archivar", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para archivar este sector",
        });
        return;
      }
      res.json(await service.archive(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
