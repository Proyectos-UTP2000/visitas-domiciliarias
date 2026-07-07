import { Router, type RequestHandler } from "express";
import type { AuthenticatedRequest } from "../../shared/authenticated-request.js";
import { HttpError } from "../../shared/http-error.js";
import { CentrosPobladosService } from "./centros-poblados.service.js";
import {
  activoPayloadSchema,
  centroPobladoCreateSchema,
  centroPobladoUpdateSchema,
} from "./centros-poblados.schemas.js";

export function createCentrosPobladosRouter(
  service: CentrosPobladosService,
  auth: RequestHandler
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

  router.get("/:id", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const record = await service.getById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && record.municipalidadId !== municipalidadId) {
        throw new HttpError(403, "No tiene permisos para ver este registro");
      }
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    
    const parsed = centroPobladoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de centro poblado inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      if (rol === "ADMIN_MUNICIPAL" && parsed.data.municipalidadId !== municipalidadId) {
        throw new HttpError(403, "No tiene permisos para crear registros en esta municipalidad");
      }
      res.status(201).json(await service.create(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    
    const parsed = centroPobladoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de centro poblado inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const record = await service.getById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && record.municipalidadId !== municipalidadId) {
        throw new HttpError(403, "No tiene permisos para modificar este registro");
      }
      res.json(await service.update(req.params.id, parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/activo", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    
    const parsed = activoPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de estado activo inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const record = await service.getById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && record.municipalidadId !== municipalidadId) {
        throw new HttpError(403, "No tiene permisos para modificar este registro");
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
      const record = await service.getById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && record.municipalidadId !== municipalidadId) {
        throw new HttpError(403, "No tiene permisos para archivar este registro");
      }
      res.json(await service.archive(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
