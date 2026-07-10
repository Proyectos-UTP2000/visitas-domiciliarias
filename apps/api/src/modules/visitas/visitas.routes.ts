import { Router, type RequestHandler } from "express";
import {
  programarVisitaSchema,
  ejecutarVisitaSchema,
  inconclusaVisitaSchema,
  reprogramarVisitaSchema,
  programarVisitaBulkSchema,
} from "./visitas.schemas.js";
import type { VisitasService } from "./visitas.service.js";
import type { AuthenticatedRequest } from "../../shared/authenticated-request.js";

export function createVisitasRouter(
  service: VisitasService,
  auth: RequestHandler
) {
  const router = Router();
  router.use(auth);

  router.get("/", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId, actorSocialId } = authReq.auth!;
    try {
      const filters: any = {};

      if (rol !== "ADMIN_GENERAL") {
        filters.municipalidadId = municipalidadId;
      } else {
        const queryMun = req.query.municipalidadId as string | undefined;
        if (queryMun) filters.municipalidadId = queryMun;
      }

      if (rol === "ACTOR_SOCIAL") {
        filters.actorSocialId = actorSocialId;
      } else {
        const queryActor = req.query.actorSocialId as string | undefined;
        if (queryActor) filters.actorSocialId = queryActor;
      }

      const queryNino = req.query.ninoId as string | undefined;
      if (queryNino) filters.ninoId = queryNino;

      const queryEstado = req.query.estado as any;
      if (queryEstado) filters.estado = queryEstado;

      res.json(await service.list(filters));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId, actorSocialId } = authReq.auth!;
    try {
      const record = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && record.nino.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a esta visita" });
        return;
      }
      if (rol === "ACTOR_SOCIAL" && record.actorSocialId !== actorSocialId) {
        res.status(403).json({ message: "No tiene permiso para acceder a esta visita" });
        return;
      }
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = programarVisitaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de programación inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      res.status(201).json(await service.programar(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.post("/bulk", async (req, res, next) => {
    const parsed = programarVisitaBulkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de programación masiva inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      res.status(201).json(await service.programarBulk(parsed.data.visitas));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/ejecutar", async (req, res, next) => {
    const parsed = ejecutarVisitaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de ejecución inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId, actorSocialId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.nino.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para modificar esta visita" });
        return;
      }
      if (rol === "ACTOR_SOCIAL" && existing.actorSocialId !== actorSocialId) {
        res.status(403).json({ message: "No tiene asignada esta visita" });
        return;
      }
      res.json(await service.ejecutar(req.params.id, parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/inconclusa", async (req, res, next) => {
    const parsed = inconclusaVisitaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId, actorSocialId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.nino.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para modificar esta visita" });
        return;
      }
      if (rol === "ACTOR_SOCIAL" && existing.actorSocialId !== actorSocialId) {
        res.status(403).json({ message: "No tiene asignada esta visita" });
        return;
      }
      res.json(await service.marcarInconclusa(req.params.id, parsed.data.motivoInconclusa));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/reprogramar", async (req, res, next) => {
    const parsed = reprogramarVisitaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de reprogramación inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId, actorSocialId } = authReq.auth!;

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.nino.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para modificar esta visita" });
        return;
      }
      if (rol === "ACTOR_SOCIAL" && existing.actorSocialId !== actorSocialId) {
        res.status(403).json({ message: "No tiene asignada esta visita" });
        return;
      }
      res.json(
        await service.reprogramar(
          req.params.id,
          parsed.data.nuevaFechaProgramada,
          parsed.data.motivo
        )
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
