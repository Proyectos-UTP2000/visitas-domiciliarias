import { z } from "zod";

export const ninoCreateSchema = z.object({
  municipalidadId: z.string().uuid("Municipalidad inválida"),
  responsableId: z.string().uuid("Responsable inválido"),
  sectorId: z.string().uuid("Sector inválido").nullable().optional(),
  dni: z.string().trim().regex(/^\d{8}$/, "DNI debe tener exactamente 8 dígitos").nullable().optional().or(z.literal("")),
  cnv: z.string().trim().min(1, "CNV inválido").max(20).nullable().optional().or(z.literal("")),
  nombres: z.string().trim().min(1, "Nombres requeridos").max(150),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(150),
  sexo: z.enum(["MASCULINO", "FEMENINO"]),
  fechaNac: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida (YYYY-MM-DD)")
    .refine((val) => {
      const [year, month, day] = val.split("-").map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return birthDate <= today;
    }, "La fecha de nacimiento no puede ser posterior a la fecha actual")
    .refine((val) => {
      const [year, month, day] = val.split("-").map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const limit = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
      return birthDate >= limit;
    }, "El niño no puede tener más de 24 meses de edad"),
  direccion: z.string().trim().min(1, "Dirección requerida").max(200),
  referencia: z.string().trim().nullable().optional().or(z.literal("")),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
}).refine(data => (data.dni && data.dni.trim() !== "") || (data.cnv && data.cnv.trim() !== ""), {
  message: "Debe ingresar el DNI o el CNV del niño",
  path: ["dni"],
});

export const ninoUpdateSchema = z.object({
  responsableId: z.string().uuid("Responsable inválido"),
  sectorId: z.string().uuid("Sector inválido").nullable().optional(),
  dni: z.string().trim().regex(/^\d{8}$/, "DNI debe tener exactamente 8 dígitos").nullable().optional().or(z.literal("")),
  cnv: z.string().trim().min(1, "CNV inválido").max(20).nullable().optional().or(z.literal("")),
  nombres: z.string().trim().min(1, "Nombres requeridos").max(150),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(150),
  sexo: z.enum(["MASCULINO", "FEMENINO"]),

  direccion: z.string().trim().min(1, "Dirección requerida").max(200),
  referencia: z.string().trim().nullable().optional().or(z.literal("")),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
}).refine(data => (data.dni && data.dni.trim() !== "") || (data.cnv && data.cnv.trim() !== ""), {
  message: "Debe ingresar el DNI o el CNV del niño",
  path: ["dni"],
});

export const activoPayloadSchema = z.object({
  activo: z.boolean(),
});

export const asignacionPayloadSchema = z.object({
  actorSocialId: z.string().uuid("Actor social inválido"),
  motivo: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres").max(500),
});

