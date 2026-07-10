import { Router, type RequestHandler } from "express";
import {
  activoPayloadSchema,
  responsableCreateSchema,
  responsableUpdateSchema,
} from "./responsables.schemas.js";
import type { ResponsablesService } from "./responsables.service.js";
import type { AuthenticatedRequest } from "../../shared/authenticated-request.js";

export function createResponsablesRouter(
  service: ResponsablesService,
  auth: RequestHandler
) {
  const router = Router();
  router.use(auth);

  router.get("/", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      if (rol !== "ADMIN_GENERAL") {
        res.json(await service.list(municipalidadId));
      } else {
        const queryMun = req.query.municipalidadId as string | undefined;
        res.json(await service.list(queryMun || null));
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const record = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && record.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este responsable" });
        return;
      }
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = responsableCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de responsable inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol !== "ADMIN_GENERAL" && parsed.data.municipalidadId !== municipalidadId) {
      res.status(403).json({
        message: "No tiene permiso para crear un responsable en otra municipalidad",
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
    const parsed = responsableUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de responsable inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar este responsable",
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
        message: "Estado activo inválido",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar este responsable",
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
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para archivar este responsable",
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
