export type SexoNino = "MASCULINO" | "FEMENINO";

export type NinoRecord = {
  id: string;
  municipalidadId: string;
  responsableId: string;
  sectorId: string | null;
  dni: string | null;
  cnv: string | null;
  nombres: string;
  apellidos: string;
  sexo: SexoNino;
  fechaNac: Date;
  direccion: string;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  archivado: boolean;
  deletedAt: Date | null;
  motivoEliminacion: string | null;
  createdAt: Date;
  updatedAt: Date;
  responsable?: any;
  sector?: any;
};

export type NinoCreateInput = {
  municipalidadId: string;
  responsableId: string;
  sectorId?: string | null;
  dni?: string | null;
  cnv?: string | null;
  nombres: string;
  apellidos: string;
  sexo: SexoNino;
  fechaNac: string | Date;
  direccion: string;
  referencia?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

export type NinoUpdateInput = Omit<NinoCreateInput, "municipalidadId" | "fechaNac">;

export type AsignacionNinoSocialRecord = {
  id: string;
  ninoId: string;
  actorSocialId: string;
  asignadoPorId: string;
  motivo: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  actorSocial?: {
    id: string;
    nombres: string;
    apellidos: string;
    dni: string;
  };
  asignadoPor?: {
    id: string;
    username: string;
  };
};

export type NinosRepository = {
  list(municipalidadId?: string | null, includeArchived?: boolean): Promise<NinoRecord[]>;
  findById(id: string): Promise<NinoRecord | null>;
  findByDni(municipalidadId: string, dni: string): Promise<NinoRecord | null>;
  findByCnv(municipalidadId: string, cnv: string): Promise<NinoRecord | null>;
  create(
    data: NinoCreateInput & { activo: boolean; archivado: boolean }
  ): Promise<NinoRecord>;
  update(id: string, data: NinoUpdateInput): Promise<NinoRecord>;
  setActivo(id: string, activo: boolean): Promise<NinoRecord>;
  archive(id: string): Promise<NinoRecord>;
  unarchive(id: string): Promise<NinoRecord>;

  // Asignaciones
  getAsignacionActiva(ninoId: string): Promise<AsignacionNinoSocialRecord | null>;
  crearAsignacion(
    ninoId: string,
    actorSocialId: string,
    asignadoPorId: string,
    motivo: string
  ): Promise<AsignacionNinoSocialRecord>;
  desactivarAsignacionActiva(ninoId: string): Promise<void>;
  listHistorialAsignaciones(ninoId: string): Promise<AsignacionNinoSocialRecord[]>;
};

