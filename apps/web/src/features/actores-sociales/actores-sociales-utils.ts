import type { ActorSocialRecord, ActorSocialFormState } from "./actores-sociales-types";

export const emptyActorSocialForm: ActorSocialFormState = {
  municipalidadId: "",
  tipoActorSocialId: "",
  grupoTrabajoId: "",
  grupoEstablecimientoId: "",
  entidadId: "",
  centroPobladoId: "",
  dni: "",
  nombres: "",
  apellidos: "",
  direccion: "",
  fechaNac: "",
  email: "",
  celular: "",
  idiomaOrigen: "",
  gradoInstruccion: "",
  inactivadoPermanentemente: false,
  username: "",
  password: "",
  sectoresIds: [],
  sectoresACorregirIds: [],
  activo: true,
  estado: "BORRADOR",
};

export function toActorSocialForm(record: ActorSocialRecord): ActorSocialFormState {
  return {
    municipalidadId: record.municipalidadId,
    tipoActorSocialId: record.tipoActorSocialId,
    grupoTrabajoId: record.grupoTrabajoId,
    grupoEstablecimientoId: record.grupoEstablecimientoId || "",
    entidadId: record.entidadId || "",
    centroPobladoId: record.centroPobladoId || "",
    dni: record.dni,
    nombres: record.nombres,
    apellidos: record.apellidos,
    direccion: record.direccion,
    fechaNac: record.fechaNac ? record.fechaNac.substring(0, 10) : "",
    email: record.email,
    celular: record.celular,
    idiomaOrigen: record.idiomaOrigen,
    gradoInstruccion: record.gradoInstruccion,
    inactivadoPermanentemente: record.inactivadoPermanentemente,
    username: "",
    sectoresIds: record.sectores ? record.sectores.map((s) => s.id) : [],
    sectoresACorregirIds: record.sectoresACorregir ? record.sectoresACorregir.map((s) => s.id) : [],
    activo: record.activo,
    estado: record.estado,
  };
}

export function filterActores(
  records: ActorSocialRecord[],
  query: string,
  municipalidadIdFilter: string,
  estadoFilter: string
): ActorSocialRecord[] {
  const q = query.trim().toLowerCase();
  return records.filter((r) => {
    if (municipalidadIdFilter && r.municipalidadId !== municipalidadIdFilter) {
      return false;
    }
    if (estadoFilter && r.estado !== estadoFilter) {
      return false;
    }
    if (q) {
      const matchDni = r.dni.toLowerCase().includes(q);
      const matchNombres = r.nombres.toLowerCase().includes(q);
      const matchApellidos = r.apellidos.toLowerCase().includes(q);
      const matchEmail = r.email.toLowerCase().includes(q);
      return matchDni || matchNombres || matchApellidos || matchEmail;
    }
    return true;
  });
}
