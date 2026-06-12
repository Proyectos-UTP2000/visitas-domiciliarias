import type { ErrorRequestHandler } from "express";
import { HttpError } from "./http-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next: unknown,
) => {
  void _next;
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null,
    });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Error interno del servidor" });
};
