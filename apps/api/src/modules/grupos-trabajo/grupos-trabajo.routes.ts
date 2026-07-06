import { Router, type RequestHandler } from "express";
import {
  activoPayloadSchema,
  grupoEstablecimientoPayloadSchema,
  grupoTrabajoEstadoSchema,
  grupoTrabajoPayloadSchema,
  grupoTrabajoUpdateSchema,
  miembroGrupoContactoSchema,
  miembroGrupoDeleteSchema,
  miembroGrupoPayloadSchema,
} from "./grupos-trabajo.schemas.js";
import type { GruposTrabajoService } from "./grupos-trabajo.service.js";
import type { AuthenticatedRequest } from "../../shared/authenticated-request.js";

function validationError(
  res: Parameters<RequestHandler>[1],
  message: string,
  error: unknown,
) {
  const details =
    error && typeof error === "object" && "flatten" in error
      ? (error as { flatten: () => unknown }).flatten()
      : null;
  res.status(400).json({ message, details });
}

export function createGruposTrabajoRouter(
  service: GruposTrabajoService,
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

  router.get("/:id", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      res.json(grupo);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = grupoTrabajoPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Datos de grupo de trabajo inválidos", parsed.error);
      return;
    }
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    if (rol === "ADMIN_MUNICIPAL" && parsed.data.municipalidadId !== municipalidadId) {
      res.status(403).json({ message: "No tiene permiso para crear un grupo de trabajo en otra municipalidad" });
      return;
    }
    try {
      res.status(201).json(await service.createGrupo(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    const parsed = grupoTrabajoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Datos de grupo de trabajo inválidos", parsed.error);
      return;
    }
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para modificar este grupo de trabajo" });
        return;
      }
      res.json(await service.updateGrupo(req.params.id, parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:grupoId/establecimientos", async (req, res, next) => {
    const parsed = grupoEstablecimientoPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Datos de establecimiento inválidos", parsed.error);
      return;
    }
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.grupoId);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      res
        .status(201)
        .json(
          await service.createEstablecimiento(req.params.grupoId, parsed.data),
        );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:grupoId/miembros", async (req, res, next) => {
    const parsed = miembroGrupoPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Datos de miembro de grupo inválidos", parsed.error);
      return;
    }
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.grupoId);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      res
        .status(201)
        .json(await service.createMiembro(req.params.grupoId, parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/:grupoId/miembros/:miembroId/contacto",
    async (req, res, next) => {
      const parsed = miembroGrupoContactoSchema.safeParse(req.body);
      if (!parsed.success) {
        validationError(
          res,
          "Datos de contacto de miembro inválidos",
          parsed.error,
        );
        return;
      }
      const authReq = req as AuthenticatedRequest;
      const { rol, municipalidadId } = authReq.auth!;
      try {
        const grupo = await service.getGrupoById(req.params.grupoId);
        if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
          res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
          return;
        }
        res.json(
          await service.updateMiembroContacto(
            req.params.grupoId,
            req.params.miembroId,
            parsed.data,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:grupoId/miembros/:miembroId/activo",
    async (req, res, next) => {
      const parsed = activoPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        validationError(res, "Estado de miembro inválido", parsed.error);
        return;
      }
      const authReq = req as AuthenticatedRequest;
      const { rol, municipalidadId } = authReq.auth!;
      try {
        const grupo = await service.getGrupoById(req.params.grupoId);
        if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
          res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
          return;
        }
        res.json(
          await service.setMiembroActivo(
            req.params.grupoId,
            req.params.miembroId,
            parsed.data.activo,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete("/:grupoId/miembros/:miembroId", async (req, res, next) => {
    const parsed = miembroGrupoDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Motivo de eliminación inválido", parsed.error);
      return;
    }
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.grupoId);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      res.json(
        await service.deleteMiembro(
          req.params.grupoId,
          req.params.miembroId,
          parsed.data,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/estado", async (req, res, next) => {
    const parsed = grupoTrabajoEstadoSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Datos de estado inválidos", parsed.error);
      return;
    }
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.id);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      res.json(
        await service.updateGrupoEstado(
          req.params.id,
          parsed.data.estado,
          parsed.data.observaciones,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
