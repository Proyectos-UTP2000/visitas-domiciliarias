import { Router, type RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  activoPayloadSchema,
  actorSocialCreateSchema,
  actorSocialUpdateSchema,
  deletePayloadSchema,
  estadoPayloadSchema,
} from "./actores-sociales.schemas.js";
import { ActoresSocialesService } from "./actores-sociales.service.js";
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
  error: unknown
) {
  const details =
    error && typeof error === "object" && "flatten" in error
      ? (error as { flatten: () => unknown }).flatten()
      : null;
  res.status(400).json({ message, details });
}

export function createActoresSocialesRouter(
  service: ActoresSocialesService,
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
        res.status(403).json({ message: "No tiene permiso para acceder a este actor social" });
        return;
      }
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = actorSocialCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Datos de actor social inválidos", parsed.error);
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol === "ACTOR_SOCIAL" || rol === "PERSONAL_SALUD") {
      res.status(403).json({
        message: "No tiene permiso para crear un actor social",
      });
      return;
    }

    if (rol !== "ADMIN_GENERAL" && parsed.data.municipalidadId !== municipalidadId) {
      res.status(403).json({
        message: "No tiene permiso para crear un actor social en otra municipalidad",
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
    const parsed = actorSocialUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Datos de actor social inválidos", parsed.error);
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol === "ACTOR_SOCIAL" || rol === "PERSONAL_SALUD") {
      res.status(403).json({
        message: "No tiene permiso para editar un actor social",
      });
      return;
    }

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para editar un actor social de otra municipalidad",
        });
        return;
      }
      res.json(
        await service.update(req.params.id, {
          ...parsed.data,
          creadoPorId: authReq.auth!.userId,
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/activo", async (req, res, next) => {
    const parsed = activoPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Estado activo inválido", parsed.error);
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol === "ACTOR_SOCIAL" || rol === "PERSONAL_SALUD") {
      res.status(403).json({
        message: "No tiene permiso para modificar este actor social",
      });
      return;
    }

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar este actor social",
        });
        return;
      }
      res.json(await service.setActivo(req.params.id, parsed.data.activo));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/estado", async (req, res, next) => {
    const parsed = estadoPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Estado inválido", parsed.error);
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol === "ACTOR_SOCIAL" || rol === "PERSONAL_SALUD") {
      res.status(403).json({
        message: "No tiene permiso para cambiar el estado de este actor social",
      });
      return;
    }

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para modificar este actor social",
        });
        return;
      }
      res.json(await service.setEstado(req.params.id, parsed.data.estado, parsed.data.observaciones));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/archivar", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol !== "ADMIN_GENERAL" && rol !== "ADMIN_MUNICIPAL") {
      res.status(403).json({
        message: "No tiene permiso para archivar este actor social",
      });
      return;
    }

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para archivar este actor social",
        });
        return;
      }
      res.json(await service.archive(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    const parsed = deletePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, "Motivo de eliminación inválido", parsed.error);
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol !== "ADMIN_GENERAL" && rol !== "ADMIN_MUNICIPAL") {
      res.status(403).json({
        message: "No tiene permiso para eliminar este actor social",
      });
      return;
    }

    try {
      const existing = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && existing.municipalidadId !== municipalidadId) {
        res.status(403).json({
          message: "No tiene permiso para eliminar este actor social",
        });
        return;
      }
      res.json(await service.delete(req.params.id, parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:actorId/archivos", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const actor = await service.getById(req.params.actorId);
      if (rol !== "ADMIN_GENERAL" && actor.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este actor social" });
        return;
      }
      res.json(await service.listArchivos(req.params.actorId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:actorId/archivos", upload.single("archivo"), async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol === "ACTOR_SOCIAL" || rol === "PERSONAL_SALUD") {
      res.status(403).json({ message: "No tiene permiso para subir archivos a este actor social" });
      return;
    }

    try {
      const actor = await service.getById(req.params.actorId as string);
      if (rol !== "ADMIN_GENERAL" && actor.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este actor social" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ message: "No se subió ningún archivo" });
        return;
      }
      const saved = await service.createArchivo(req.params.actorId as string, {
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
      const actor = await service.getById(archivo.actorSocialId);
      if (rol !== "ADMIN_GENERAL" && actor.municipalidadId !== municipalidadId) {
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
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:actorId/archivos/:archivoId", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;

    if (rol === "ACTOR_SOCIAL" || rol === "PERSONAL_SALUD") {
      res.status(403).json({ message: "No tiene permiso para eliminar archivos de este actor social" });
      return;
    }

    try {
      const actor = await service.getById(req.params.actorId);
      if (rol !== "ADMIN_GENERAL" && actor.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este actor social" });
        return;
      }
      const deleted = await service.deleteArchivo(req.params.actorId, req.params.archivoId);
      const filePath = path.resolve("./uploads", deleted.rutaArchivo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json(deleted);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/historial-geografico", async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const { rol, municipalidadId } = authReq.auth!;
    try {
      const record = await service.getById(req.params.id);
      if (rol !== "ADMIN_GENERAL" && record.municipalidadId !== municipalidadId) {
        res.status(403).json({ message: "No tiene permiso para acceder a este actor social" });
        return;
      }
      res.json(await service.listHistorialGeografico(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
