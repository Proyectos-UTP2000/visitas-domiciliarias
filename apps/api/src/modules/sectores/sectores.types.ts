export type TipoSector = "URBANO" | "RURAL";

export type SectorUrbanoInput = {
  zona: string;
  manzana: string;
};

export type SectorRuralInput = {
  latitud?: number | null;
  longitud?: number | null;
  poblacion?: number | null;
};

export type SectorRecord = {
  id: string;
  municipalidadId: string;
  centroPobladoId: string;
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  nombreSector: string;
  tipoSector: TipoSector;
  activo: boolean;
  archivado: boolean;
  urbano?: SectorUrbanoInput | null;
  rural?: SectorRuralInput | null;
  centroPoblado?: { id: string; nombre: string; tipo: string } | null;
};

export type SectorPayload = Omit<SectorRecord, "id" | "activo" | "archivado" | "centroPoblado">;

export type SectorCreateData = SectorPayload & {
  activo: true;
  archivado: false;
};

export type SectoresRepository = {
  list(municipalidadId?: string | null): Promise<SectorRecord[]>;
  findById(id: string): Promise<{ id: string; municipalidadId: string } | null>;
  findByMunicipalidadAndCodigo(
    municipalidadId: string,
    codigo: string,
  ): Promise<{ id: string } | null>;
  create(data: SectorCreateData): Promise<SectorRecord>;
  update(id: string, data: SectorPayload): Promise<SectorRecord>;
  setActivo(id: string, activo: boolean): Promise<SectorRecord>;
  archive(id: string): Promise<SectorRecord>;
};

