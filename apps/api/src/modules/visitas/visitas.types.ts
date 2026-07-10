export type EstadoVisita = "PROGRAMADA" | "EJECUTADA" | "REPROGRAMADA" | "INCONCLUSA";

export type VisitaDomiciliariaRecord = {
  id: string;
  ninoId: string;
  actorSocialId: string;
  fechaProgramada: Date;
  fechaEjecucion: Date | null;
  estado: EstadoVisita;
  motivoInconclusa: string | null;
  peso: number | null;
  hierroEntregado: boolean | null;
  consejeriaBrindada: boolean | null;
  alertas: string | null;
  comentarios: string | null;
  tipoRegistro: string | null;
  latitud: string | null;
  longitud: string | null;
  evidenciaUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  nino?: any;
  actorSocial?: any;
};

export type VisitaProgramarInput = {
  ninoId: string;
  actorSocialId: string;
  fechaProgramada: string | Date;
};

export type VisitaEjecutarInput = {
  fechaEjecucion: string | Date;
  peso?: number | null;
  hierroEntregado?: boolean | null;
  consejeriaBrindada?: boolean | null;
  alertas?: string | null;
  comentarios?: string | null;
  tipoRegistro?: string | null;
  latitud?: string | null;
  longitud?: string | null;
  evidenciaUrl?: string | null;
};

export type VisitasRepository = {
  list(filters: {
    municipalidadId?: string | null;
    actorSocialId?: string | null;
    ninoId?: string | null;
    estado?: EstadoVisita | null;
  }): Promise<VisitaDomiciliariaRecord[]>;
  findById(id: string): Promise<VisitaDomiciliariaRecord | null>;
  create(data: {
    ninoId: string;
    actorSocialId: string;
    fechaProgramada: Date;
    estado: EstadoVisita;
  }): Promise<VisitaDomiciliariaRecord>;
  createBulk(data: {
    ninoId: string;
    actorSocialId: string;
    fechaProgramada: Date;
    estado: EstadoVisita;
  }[]): Promise<VisitaDomiciliariaRecord[]>;
  updateEstado(
    id: string,
    estado: EstadoVisita,
    extra?: Partial<Omit<VisitaDomiciliariaRecord, "id" | "estado" | "createdAt" | "updatedAt">>
  ): Promise<VisitaDomiciliariaRecord>;

  // Validaciones desacopladas
  findNinoById(id: string): Promise<{ id: string; municipalidadId: string; activo: boolean; fechaNac: Date; apellidos: string; nombres: string } | null>;
  findActorById(id: string): Promise<{ id: string; municipalidadId: string; activo: boolean } | null>;
  reprogramarVisita(
    visitaId: string,
    motivo: string,
    nuevaFechaProgramada: Date
  ): Promise<{ vieja: VisitaDomiciliariaRecord; nueva: VisitaDomiciliariaRecord }>;
};

