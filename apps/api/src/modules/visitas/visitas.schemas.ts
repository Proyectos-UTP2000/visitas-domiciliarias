import { z } from "zod";

export const programarVisitaSchema = z.object({
  ninoId: z.string().uuid("Niño inválido"),
  actorSocialId: z.string().uuid("Actor social inválido"),
  fechaProgramada: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
    .refine((val) => {
      const [year, month, day] = val.split("-").map(Number);
      const dateVal = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(dateVal.getTime()) && dateVal > today;
    }, "La fecha programada debe ser posterior a la fecha actual"),
});

export const ejecutarVisitaSchema = z.object({
  fechaEjecucion: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
    .refine((val) => {
      const [year, month, day] = val.split("-").map(Number);
      const dateVal = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(dateVal.getTime()) && dateVal <= today;
    }, "La fecha de ejecución debe ser una fecha válida e igual o anterior a la fecha actual"),
  peso: z.number().positive("El peso debe ser mayor a cero").nullable().optional(),
  hierroEntregado: z.boolean().nullable().optional(),
  consejeriaBrindada: z.boolean().nullable().optional(),
  alertas: z.string().trim().max(500).nullable().optional().or(z.literal("")),
  comentarios: z.string().trim().max(1000).nullable().optional().or(z.literal("")),
  tipoRegistro: z.string().max(100).nullable().optional(),
  latitud: z.string().max(50).nullable().optional(),
  longitud: z.string().max(50).nullable().optional(),
  evidenciaUrl: z.string().nullable().optional(),
});

export const inconclusaVisitaSchema = z.object({
  motivoInconclusa: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres").max(500),
});

export const reprogramarVisitaSchema = z.object({
  nuevaFechaProgramada: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
    .refine((val) => {
      const [year, month, day] = val.split("-").map(Number);
      const dateVal = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(dateVal.getTime()) && dateVal > today;
    }, "La fecha reprogramada debe ser posterior a la fecha actual"),
  motivo: z.string().trim().min(5, "El motivo de reprogramación debe tener al menos 5 caracteres").max(500),
});

export const programarVisitaBulkSchema = z.object({
  visitas: z.array(
    z.object({
      ninoId: z.string().uuid("Niño inválido"),
      actorSocialId: z.string().uuid("Actor social inválido"),
      fechaProgramada: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
        .refine((val) => {
          const [year, month, day] = val.split("-").map(Number);
          const dateVal = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return !isNaN(dateVal.getTime()) && dateVal > today;
        }, "La fecha programada debe ser posterior a la fecha actual"),
    })
  ).min(1, "Debe enviar al menos una visita"),
});
