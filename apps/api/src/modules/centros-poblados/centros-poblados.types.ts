export type CentroPobladoRecord = {
  id: string;
  municipalidadId: string;
  nombre: string;
  codigo: string | null;
  tipo: string;
  latitud: number | null;
  longitud: number | null;
  poblacion: number | null;
  activo: boolean;
  archivado: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CentroPobladoCreateInput = {
  municipalidadId: string;
  nombre: string;
  codigo?: string | null;
  tipo: string;
  latitud?: number | null;
  longitud?: number | null;
  poblacion?: number | null;
};

export type CentroPobladoUpdateInput = {
  nombre: string;
  codigo?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  poblacion?: number | null;
};

export type CentrosPobladosRepository = {
  list(municipalidadId?: string | null): Promise<CentroPobladoRecord[]>;
  findById(id: string): Promise<CentroPobladoRecord | null>;
  findByNameAndType(municipalidadId: string, nombre: string, tipo: string): Promise<CentroPobladoRecord | null>;
  create(data: CentroPobladoCreateInput): Promise<CentroPobladoRecord>;
  update(id: string, data: CentroPobladoUpdateInput): Promise<CentroPobladoRecord>;
  setActivo(id: string, activo: boolean): Promise<CentroPobladoRecord>;
  archive(id: string): Promise<CentroPobladoRecord>;
};
