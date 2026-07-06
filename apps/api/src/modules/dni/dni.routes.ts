import { Router, type RequestHandler } from "express";
import type { DniService } from "./dni.service.js";

export function createDniRouter(service: DniService, auth: RequestHandler) {
  const router = Router();
  router.use(auth);

  router.get("/:dni", async (req, res, next) => {
    try {
      const datos = await service.consultarDni(req.params.dni);
      res.json(datos);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
