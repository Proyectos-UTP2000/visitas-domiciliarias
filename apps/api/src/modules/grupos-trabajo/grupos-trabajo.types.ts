export type EstadoGrupoTrabajo =
  | "BORRADOR"
  | "REGISTRADO"
  | "OBSERVADO"
  | "VALIDADO"
  | "RECHAZADO";

export type GrupoTrabajoRecord = {
  id: string;
  municipalidadId: string;
  fechaLimite: Date;
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

export type GrupoTrabajoCreateInput = Omit<
  GrupoTrabajoRecord,
  "id" | "fechaLimite" | "estado" | "activo" | "archivado" | "observaciones"
> & {
  fechaLimite: string | Date;
  observaciones?: string | null;
};

export type GrupoEstablecimientoRecord = {
  id: string;
  grupoTrabajoId: string;
  nombre: string;
  codigo: string | null;
  direccion: string | null;
  activo: boolean;
};

export type GrupoEstablecimientoCreateInput = {
  nombre: string;
  codigo?: string | null;
  direccion?: string | null;
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
  deletedAt?: Date | null;
  motivoEliminacion?: string | null;
};

export type MiembroGrupoCreateInput = {
  grupoEstablecimientoId?: string | null;
  cargoMiembroGrupoId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular?: string | null;
  email?: string | null;
};

export type MiembroGrupoContactoInput = {
  grupoEstablecimientoId?: string | null;
  celular?: string | null;
  email?: string | null;
};

export type MiembroGrupoDeleteInput = {
  motivoEliminacion: string;
};

export type MiembroGrupoDeleteResult = MiembroGrupoRecord & {
  notificationMessage: string;
};

export type GrupoTrabajoArchivoRecord = {
  id: string;
  grupoTrabajoId: string;
  nombreArchivo: string;
  rutaArchivo: string;
  mimeType: string;
  createdAt: Date;
};

export type GrupoTrabajoRecordWithRelations = GrupoTrabajoRecord & {
  establecimientos: GrupoEstablecimientoRecord[];
  miembros: MiembroGrupoRecord[];
  archivos: GrupoTrabajoArchivoRecord[];
};

export type GruposTrabajoRepository = {
  list(municipalidadId: string | null): Promise<GrupoTrabajoRecord[]>;
  findGrupoById(id: string): Promise<{ id: string; municipalidadId: string; estado: EstadoGrupoTrabajo } | null>;
  findFullGrupoById(id: string): Promise<GrupoTrabajoRecordWithRelations | null>;
  findCargoById(id: string): Promise<{ id: string } | null>;
  findEstablecimientoById(
    id: string,
  ): Promise<{ id: string; grupoTrabajoId: string } | null>;
  createGrupo(
    data: GrupoTrabajoCreateInput & {
      estado: "BORRADOR";
      activo: true;
      archivado: false;
    },
  ): Promise<GrupoTrabajoRecord>;
  updateGrupo(
    id: string,
    data: Partial<GrupoTrabajoCreateInput>
  ): Promise<GrupoTrabajoRecord>;
  createEstablecimiento(
    data: GrupoEstablecimientoCreateInput & {
      grupoTrabajoId: string;
      activo: true;
    },
  ): Promise<GrupoEstablecimientoRecord>;
  createMiembro(
    data: MiembroGrupoCreateInput & {
      grupoTrabajoId: string;
      grupoEstablecimientoId?: string | null;
      activo: true;
      archivado: false;
    },
  ): Promise<MiembroGrupoRecord>;
  updateMiembroContacto(
    grupoTrabajoId: string,
    miembroId: string,
    data: MiembroGrupoContactoInput,
  ): Promise<MiembroGrupoRecord>;
  setMiembroActivo(
    grupoTrabajoId: string,
    miembroId: string,
    activo: boolean,
  ): Promise<MiembroGrupoRecord>;
  deleteMiembro(
    grupoTrabajoId: string,
    miembroId: string,
    data: MiembroGrupoDeleteInput,
  ): Promise<MiembroGrupoRecord>;
  updateGrupoEstado(
    id: string,
    estado: EstadoGrupoTrabajo,
    observaciones?: string | null,
  ): Promise<GrupoTrabajoRecord>;
  createArchivo(
    data: {
      grupoTrabajoId: string;
      nombreArchivo: string;
      rutaArchivo: string;
      mimeType: string;
    }
  ): Promise<GrupoTrabajoArchivoRecord>;
  findArchivoById(id: string): Promise<GrupoTrabajoArchivoRecord | null>;
  listArchivos(grupoTrabajoId: string): Promise<GrupoTrabajoArchivoRecord[]>;
  deleteArchivo(id: string): Promise<GrupoTrabajoArchivoRecord>;
};
