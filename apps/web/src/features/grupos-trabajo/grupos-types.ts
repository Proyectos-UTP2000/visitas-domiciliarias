export type EstadoGrupoTrabajo = "BORRADOR" | "REGISTRADO" | "OBSERVADO" | "VALIDADO" | "RECHAZADO";

export type GrupoTrabajoRecord = {
  id: string;
  municipalidadId: string;
  fechaLimite: string;
  nombreGrupo: string;
  periodoYear: number;
  dniRepresentante: string;
  nombreRepresentante: string;
  apellidosRepresentante: string;
  estado: EstadoGrupoTrabajo;
  observaciones: string | null;
  activo: boolean;
  archivado: boolean;
};

export type GrupoEstablecimientoRecord = {
  id: string;
  grupoTrabajoId: string;
  nombre: string;
  codigo: string | null;
  direccion: string | null;
  activo: boolean;
};

export type MiembroGrupoRecord = {
  id: string;
  grupoTrabajoId: string;
  grupoEstablecimientoId: string | null;
  cargoMiembroGrupoId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  email: string | null;
  activo: boolean;
  archivado: boolean;
  cargoMiembroGrupo?: {
    id: string;
    nombre: string;
  } | null;
  grupoEstablecimiento?: {
    id: string;
    nombre: string;
  } | null;
};

export type GrupoTrabajoFormState = {
  municipalidadId: string;
  fechaLimite: string;
  nombreGrupo: string;
  periodoYear: string;
  dniRepresentante: string;
  nombreRepresentante: string;
  apellidosRepresentante: string;
};

export type GrupoEstablecimientoFormState = {
  nombre: string;
  codigo: string;
  direccion: string;
};

export type MiembroGrupoFormState = {
  grupoEstablecimientoId: string;
  cargoMiembroGrupoId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string;
  email: string;
};

export type GrupoTrabajoArchivoRecord = {
  id: string;
  grupoTrabajoId: string;
  nombreArchivo: string;
  rutaArchivo: string;
  mimeType: string;
  createdAt: string;
};

export type GrupoTrabajoRecordWithRelations = GrupoTrabajoRecord & {
  establecimientos: GrupoEstablecimientoRecord[];
  miembros: MiembroGrupoRecord[];
  archivos: GrupoTrabajoArchivoRecord[];
};

