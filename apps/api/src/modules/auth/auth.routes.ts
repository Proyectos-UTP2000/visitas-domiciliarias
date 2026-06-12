import { Router } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";
import type { LoginInput, LoginResult } from "./auth.types.js";

type LoginUseCase = {
  login(input: LoginInput): Promise<LoginResult>;
  forgotPassword(input: { email: string }): Promise<void>;
  resetPassword(input: { token: string; password: string }): Promise<void>;
};

export function createAuthRouter(loginUseCase: LoginUseCase) {
  const router = Router();

  router.post("/login", async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de login inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const result = await loginUseCase.login(parsed.data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/forgot-password", async (req, res, next) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de solicitud inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      await loginUseCase.forgotPassword(parsed.data);
      res.json({
        message: "Se ha enviado un enlace de recuperación a su correo.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reset-password", async (req, res, next) => {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Datos de restablecimiento inválidos",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      await loginUseCase.resetPassword(parsed.data);
      res.json({ message: "Contraseña restablecida con éxito." });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
