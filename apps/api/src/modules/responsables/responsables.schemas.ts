import { z } from "zod";

export const responsableCreateSchema = z.object({
  municipalidadId: z.string().uuid("Municipalidad inválida"),
  tipoDocumento: z.string().trim().min(1, "Tipo de documento requerido").max(20),
  dni: z.string().trim().min(1, "Número de documento requerido").max(15),
  nombres: z.string().trim().min(1, "Nombres requeridos").max(150),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(150),
  celular: z.string().trim().regex(/^\d{9}$/, "Celular debe tener exactamente 9 dígitos").nullable().optional(),
  email: z.string().email("Correo electrónico inválido").nullable().optional().or(z.literal("")),
});

export const responsableUpdateSchema = z.object({
  tipoDocumento: z.string().trim().min(1, "Tipo de documento requerido").max(20),
  dni: z.string().trim().min(1, "Número de documento requerido").max(15),
  nombres: z.string().trim().min(1, "Nombres requeridos").max(150),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(150),
  celular: z.string().trim().regex(/^\d{9}$/, "Celular debe tener exactamente 9 dígitos").nullable().optional(),
  email: z.string().email("Correo electrónico inválido").nullable().optional().or(z.literal("")),
});

export const activoPayloadSchema = z.object({
  activo: z.boolean(),
});
