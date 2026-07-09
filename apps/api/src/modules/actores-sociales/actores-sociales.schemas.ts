import { z } from "zod";
import { passwordStrengthSchema } from "../auth/auth.schemas.js";

export const actorSocialCreateSchema = z.object({
  municipalidadId: z.uuid(),
  tipoActorSocialId: z.uuid(),
  grupoTrabajoId: z.uuid(),
  grupoEstablecimientoId: z.uuid().nullable().optional(),
  entidadId: z.uuid().nullable().optional(),
  centroPobladoId: z.uuid().nullable().optional(),
  dni: z.string().trim().regex(/^\d{8}$/, "DNI debe tener exactamente 8 dígitos"),
  nombres: z.string().trim().min(1, "Nombres requeridos").max(150),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(150),
  direccion: z.string().trim().min(1, "Dirección requerida").max(200),
  fechaNac: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
    .refine((val) => {
      const [year, month, day] = val.split("-").map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return birthDate < today;
    }, {
      message: "La fecha de nacimiento debe ser anterior a la fecha actual",
    }),
  email: z.string().email("Email inválido").max(150),
  celular: z.string().trim().regex(/^\d{9}$/, "Celular debe tener exactamente 9 dígitos"),
  idiomaOrigen: z.string().trim().min(1, "Idioma de origen requerido").max(100),
  gradoInstruccion: z.string().trim().min(1, "Grado de instrucción requerido").max(100),
  username: z.string().trim().min(3, "Usuario debe tener al menos 3 caracteres").max(80),
  password: passwordStrengthSchema,
  sectoresIds: z.array(z.uuid()).optional(),
  sectoresACorregirIds: z.array(z.uuid()).optional(),
});

export const actorSocialUpdateSchema = z.object({
  tipoActorSocialId: z.uuid(),
  grupoTrabajoId: z.uuid(),
  grupoEstablecimientoId: z.uuid().nullable().optional(),
  entidadId: z.uuid().nullable().optional(),
  centroPobladoId: z.uuid().nullable().optional(),
  email: z.string().email("Email inválido").max(150),
  celular: z.string().trim().regex(/^\d{9}$/, "Celular debe tener exactamente 9 dígitos"),
  direccion: z.string().trim().min(1, "Dirección requerida").max(200),
  gradoInstruccion: z.string().trim().min(1, "Grado de instrucción requerido").max(100),
  inactivadoPermanentemente: z.boolean().optional(),
  sectoresIds: z.array(z.uuid()).optional(),
  sectoresACorregirIds: z.array(z.uuid()).optional(),
});

export const activoPayloadSchema = z.object({
  activo: z.boolean(),
});

export const estadoPayloadSchema = z.object({
  estado: z.enum(["BORRADOR", "REGISTRADO", "VALIDADO", "APROBADO"]),
  observaciones: z.string().trim().nullable().optional(),
});

export const deletePayloadSchema = z.object({
  motivoEliminacion: z.string().trim().min(1, "El motivo de eliminación es obligatorio"),
});
