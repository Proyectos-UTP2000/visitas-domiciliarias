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
  fechaNac: Date;
  email: string;
  celular: string;
  idiomaOrigen: string;
  gradoInstruccion: string;
  estado: EstadoActorSocial;
  activo: boolean;
  inactivadoPermanentemente: boolean;
  archivado: boolean;
  deletedAt: Date | null;
  motivoEliminacion: string | null;
  createdAt: Date;
  updatedAt: Date;
  sectores?: any[];
  sectoresACorregir?: any[];
  centroPoblado?: any;
};

export type ActorSocialCreateInput = {
  municipalidadId: string;
  tipoActorSocialId: string;
  grupoTrabajoId: string;
  grupoEstablecimientoId?: string | null;
  entidadId?: string | null;
  centroPobladoId?: string | null;
  dni: string;
  nombres: string;
  apellidos: string;
  direccion: string;
  fechaNac: string | Date;
  email: string;
  celular: string;
  idiomaOrigen: string;
  gradoInstruccion: string;
  username: string;
  password: string;
  sectoresIds?: string[];
  sectoresACorregirIds?: string[];
};

export type ActorSocialUpdateInput = {
  tipoActorSocialId: string;
  grupoTrabajoId: string;
  grupoEstablecimientoId?: string | null;
  entidadId?: string | null;
  centroPobladoId?: string | null;
  email: string;
  celular: string;
  direccion: string;
  gradoInstruccion: string;
  inactivadoPermanentemente?: boolean;
  sectoresIds?: string[];
  sectoresACorregirIds?: string[];
};

export type ActoresSocialesRepository = {
  list(municipalidadId?: string | null): Promise<ActorSocialRecord[]>;
  findById(id: string): Promise<ActorSocialRecord | null>;
  findByDni(municipalidadId: string, dni: string): Promise<ActorSocialRecord | null>;
  findByUsername(username: string): Promise<boolean>;
  create(
    data: Omit<ActorSocialCreateInput, "password"> & {
      passwordHash: string;
      estado: "BORRADOR";
      activo: boolean;
      archivado: boolean;
    }
  ): Promise<ActorSocialRecord>;
  update(id: string, data: ActorSocialUpdateInput): Promise<ActorSocialRecord>;
  setActivo(id: string, activo: boolean): Promise<ActorSocialRecord>;
  setEstado(id: string, estado: EstadoActorSocial): Promise<ActorSocialRecord>;
  archive(id: string): Promise<ActorSocialRecord>;
  delete(id: string, motivoEliminacion: string): Promise<ActorSocialRecord>;
};
