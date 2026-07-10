import { Router, type RequestHandler } from "express";
import type { ReportesService } from "./reportes.service.js";
import type { AuthenticatedRequest } from "../../shared/authenticated-request.js";

export function createReportesRouter(
  service: ReportesService,
  auth: RequestHandler
) {
  const router = Router();
  router.use(auth);

  router.get("/actividad", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId: userMuniId } = authReq.auth!;

    try {
      const filtros: any = {};

      if (rol !== "ADMIN_GENERAL") {
        filtros.municipalidadId = userMuniId;
      } else {
        const queryMuni = req.query.municipalidadId as string | undefined;
        if (queryMuni) {
          filtros.municipalidadId = queryMuni;
        }
      }

      const queryActor = req.query.actorSocialId as string | undefined;
      if (queryActor) filtros.actorSocialId = queryActor;

      const querySector = req.query.sectorId as string | undefined;
      if (querySector) filtros.sectorId = querySector;

      const queryFechaInicio = req.query.fechaInicio as string | undefined;
      if (queryFechaInicio) filtros.fechaInicio = queryFechaInicio;

      const queryFechaFin = req.query.fechaFin as string | undefined;
      if (queryFechaFin) filtros.fechaFin = queryFechaFin;

      const data = await service.getActividad(filtros);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  router.get("/operativos", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId: userMuniId } = authReq.auth!;

    try {
      const filtros: any = {};

      if (rol !== "ADMIN_GENERAL") {
        filtros.municipalidadId = userMuniId;
      } else {
        const queryMuni = req.query.municipalidadId as string | undefined;
        if (queryMuni) {
          filtros.municipalidadId = queryMuni;
        }
      }

      const querySector = req.query.sectorId as string | undefined;
      if (querySector) filtros.sectorId = querySector;

      const data = await service.getOperativos(filtros);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
