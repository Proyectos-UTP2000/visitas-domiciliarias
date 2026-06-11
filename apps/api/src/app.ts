import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthRouter } from "./modules/health/health.routes.js";
import { errorHandler } from "./shared/error-handler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use("/api/v1", healthRouter);

  app.use(errorHandler);

  return app;
}
