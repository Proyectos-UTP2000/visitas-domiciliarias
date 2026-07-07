import { z } from "zod";

const urbanoSchema = z.object({
  zona: z.string().trim().min(1).max(3),
  manzana: z.string().trim().min(1).max(10),
});

const ruralSchema = z.object({
  latitud: z.coerce.number().nullable().optional(),
  longitud: z.coerce.number().nullable().optional(),
  poblacion: z.coerce.number().int().min(0).nullable().optional(),
});

export const sectorPayloadSchema = z.object({
  municipalidadId: z.uuid(),
  codigo: z.string().trim().min(1).max(100),
  departamento: z.string().trim().min(1).max(100),
  provincia: z.string().trim().min(1).max(100),
  distrito: z.string().trim().min(1).max(100),
  centroPobladoId: z.string().uuid("Centro Poblado inválido"),
  nombreSector: z.string().trim().min(1).max(100),
  tipoSector: z.enum(["URBANO", "RURAL"]),
  urbano: urbanoSchema.optional(),
  rural: ruralSchema.optional(),
});

export const activoPayloadSchema = z.object({ activo: z.boolean() });
