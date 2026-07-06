import { z } from "zod";

export const grupoTrabajoPayloadSchema = z.object({
  municipalidadId: z.uuid(),
  fechaLimite: z.iso.date(),
  nombreGrupo: z.string().trim().min(1).max(150),
  periodoYear: z.coerce.number().int().min(2000).max(32767),
  dniRepresentante: z
    .string()
    .trim()
    .regex(/^\d{8}$/),
  nombreRepresentante: z.string().trim().min(1).max(150),
  apellidosRepresentante: z.string().trim().min(1).max(200),
});

export const grupoTrabajoUpdateSchema = grupoTrabajoPayloadSchema.partial();

export const grupoEstablecimientoPayloadSchema = z.object({
  nombre: z.string().trim().min(1).max(150),
  codigo: z.string().trim().min(1).max(50).nullable().optional(),
  direccion: z.string().trim().min(1).max(200).nullable().optional(),
});

export const miembroGrupoPayloadSchema = z.object({
  grupoEstablecimientoId: z.uuid().nullable().optional(),
  cargoMiembroGrupoId: z.uuid(),
  dni: z
    .string()
    .trim()
    .regex(/^\d{8}$/),
  nombres: z.string().trim().min(1).max(150),
  apellidos: z.string().trim().min(1).max(200),
  celular: z
    .string()
    .trim()
    .regex(/^\d{9}$/)
    .nullable()
    .optional(),
  email: z.email().nullable().optional(),
});

export const miembroGrupoContactoSchema = z.object({
  grupoEstablecimientoId: z.uuid().nullable().optional(),
  celular: z
    .string()
    .trim()
    .regex(/^\d{9}$/)
    .nullable()
    .optional(),
  email: z.email().nullable().optional(),
});

export const activoPayloadSchema = z.object({ activo: z.boolean() });

export const miembroGrupoDeleteSchema = z.object({
  motivoEliminacion: z.string().trim().min(1),
});

export const grupoTrabajoEstadoSchema = z.object({
  estado: z.enum(["BORRADOR", "REGISTRADO", "OBSERVADO", "VALIDADO", "RECHAZADO"]),
  observaciones: z.string().trim().nullable().optional(),
});
