export type EstadoActorSocial =
  | "BORRADOR"
  | "REGISTRADO"
  | "VALIDO"
  | "APROBADO";

export type ActorSocialRecord = {
  id: string;
  usuarioId: string | null;
  municipalidadId: string;
  tipoActorSocialId: string;
  grupoTrabajoId: string;
  grupoEstablecimientoId: string | null;
  entidadId: string | null;
  centroPobladoId: string | null;
  dni: string;
  nombres: string;
  apellidos: string;
  direccion: string;
  fechaNac: string;
  email: string;
  celular: string;
  idiomaOrigen: string;
  gradoInstruccion: string;
  estado: EstadoActorSocial;
  activo: boolean;
  inactivadoPermanentemente: boolean;
  archivado: boolean;
  sectores?: { id: string; nombreSector: string; centroPoblado?: { nombre: string } | null; urbano?: { zona: string; manzana: string } | null }[];
  sectoresACorregir?: { id: string; nombreSector: string; centroPoblado?: { nombre: string } | null }[];
  centroPoblado?: { id: string; nombre: string; tipo: string } | null;
};

export type ActorSocialFormState = {
  municipalidadId: string;
  tipoActorSocialId: string;
  grupoTrabajoId: string;
  grupoEstablecimientoId: string;
  entidadId: string;
  centroPobladoId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  direccion: string;
  fechaNac: string;
  email: string;
  celular: string;
  idiomaOrigen: string;
  gradoInstruccion: string;
  inactivadoPermanentemente: boolean;
  username: string;
  password?: string;
  sectoresIds: string[];
  sectoresACorregirIds: string[];
  activo: boolean;
  estado: EstadoActorSocial;
};
