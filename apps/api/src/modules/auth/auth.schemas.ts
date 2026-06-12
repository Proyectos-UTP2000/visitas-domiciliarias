import { z } from "zod";

export const passwordStrengthSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "La contraseña debe tener al menos una letra mayúscula")
  .regex(/[a-z]/, "La contraseña debe tener al menos una letra minúscula")
  .regex(/\d/, "La contraseña debe tener al menos un número")
  .regex(
    /[^A-Za-z0-9]/,
    "La contraseña debe tener al menos un carácter especial (ej. _, $, *, @, #)",
  );

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Token requerido"),
  password: passwordStrengthSchema,
});
