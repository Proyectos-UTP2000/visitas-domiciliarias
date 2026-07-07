import { Router, type RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

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

  router.get("/:grupoId/archivos", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.grupoId);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      res.json(await service.listArchivos(req.params.grupoId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:grupoId/archivos", upload.single("archivo"), async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.grupoId as string);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ message: "No se subió ningún archivo" });
        return;
      }
      const saved = await service.createArchivo(req.params.grupoId as string, {
        nombreArchivo: req.file.originalname,
        rutaArchivo: req.file.filename,
        mimeType: req.file.mimetype,
      });
      res.status(201).json(saved);
    } catch (error) {
      next(error);
    }
  });

  router.get("/archivos/:archivoId", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const archivo = await service.getArchivoById(req.params.archivoId);
      const grupo = await service.getGrupoById(archivo.grupoTrabajoId);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este archivo" });
        return;
      }
      const filePath = path.resolve("./uploads", archivo.rutaArchivo);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: "Archivo físico no encontrado en el servidor" });
        return;
      }
      res.setHeader("Content-Type", archivo.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(archivo.nombreArchivo)}"`
      );
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:grupoId/archivos/:archivoId", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const grupo = await service.getGrupoById(req.params.grupoId);
      if (rol === "ADMIN_MUNICIPAL" && grupo.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este grupo de trabajo" });
        return;
      }
      const deleted = await service.deleteArchivo(req.params.grupoId, req.params.archivoId);
      const filePath = path.resolve("./uploads", deleted.rutaArchivo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json(deleted);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const userMuniId = rol === "ADMIN_MUNICIPAL" ? municipalidadId : null;
      await service.deleteGrupo(req.params.id, userMuniId);
      res.json({ success: true, message: "Grupo de trabajo eliminado correctamente" });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/archivar", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const userMuniId = rol === "ADMIN_MUNICIPAL" ? municipalidadId : null;
      const updated = await service.archivarGrupo(req.params.id, userMuniId);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
