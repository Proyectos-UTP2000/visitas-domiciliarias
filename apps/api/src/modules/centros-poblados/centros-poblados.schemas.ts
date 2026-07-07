import { z } from "zod";

export const centroPobladoCreateSchema = z.object({
  municipalidadId: z.string().uuid("Municipalidad inválida"),
  nombre: z.string().trim().min(1, "Nombre requerido").max(150, "Nombre demasiado largo"),
  codigo: z.string().trim().max(50, "Código demasiado largo").nullable().optional(),
  tipo: z.enum(["URBANO", "RURAL"]),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  poblacion: z.number().int().nonnegative("La población no puede ser negativa").nullable().optional(),
});

export const centroPobladoUpdateSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(150, "Nombre demasiado largo"),
  codigo: z.string().trim().max(50, "Código demasiado largo").nullable().optional(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  poblacion: z.number().int().nonnegative("La población no puede ser negativa").nullable().optional(),
});

export const activoPayloadSchema = z.object({
  activo: z.boolean(),
});
