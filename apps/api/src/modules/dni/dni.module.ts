import { authMiddleware } from "../../shared/auth.middleware.js";
import { createDniRouter } from "./dni.routes.js";
import { DniService } from "./dni.service.js";

export function createDefaultDniRouter() {
  const service = new DniService();
  return createDniRouter(service, authMiddleware);
}
