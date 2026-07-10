import { Router, type RequestHandler } from "express";
import {
  activoPayloadSchema,
  ninoCreateSchema,
  ninoUpdateSchema,
  asignacionPayloadSchema,
} from "./ninos.schemas.js";
import type { NinosService } from "./ninos.service.js";
import type { AuthenticatedRequest } from "../../shared/authenticated-request.js";

export function createNinosRouter(
  service: NinosService,
  auth: RequestHandler
) {
  const router = Router();
  router.use(auth);

  router.get("/", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    const includeArchived = req.query.archivado === "true";
    try {
      if (rol !== "ADMIN_GENERAL") {
        res.json(await service.list(municipalidadId, includeArchived));
      } else {
        const queryMun = req.query.municipalidadId as string | undefined;
        res.json(await service.list(queryMun || null, includeArchived));
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
        res.status(403).json({ message: "No tiene permiso para acceder a este niño" });
        return;
      }
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = ninoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de niño inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol !== "ADMIN_GENERAL" && parsed.data.municipalidadId !== municipalidadId) {
      res.status(403).json({
        message: "No tiene permiso para registrar un niño en otra municipalidad",
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
    const parsed = ninoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de niño inválidos",
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
          message: "No tiene permiso para modificar este niño",
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
          message: "No tiene permiso para modificar este niño",
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
          message: "No tiene permiso para archivar este niño",
        });
        return;
      }
      res.json(await service.archive(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/desarchivar", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para desarchivar este niño",
        });
        return;
      }
      res.json(await service.unarchive(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/asignar", async (req, res, next) => {
    const parsed = asignacionPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de asignación inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId, userId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar la asignación de este niño",
        });
        return;
      }
      res.json(
        await service.asignarActorSocial(
          req.params.id,
          parsed.data.actorSocialId,
          userId,
          parsed.data.motivo
        )
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/desasignar", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar la asignación de este niño",
        });
        return;
      }
      await service.desasignarActorSocial(req.params.id);
      res.json({ message: "Desasignación realizada con éxito" });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/historial-asignaciones", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para ver el historial de este niño",
        });
        return;
      }
      res.json(await service.listHistorialAsignaciones(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
