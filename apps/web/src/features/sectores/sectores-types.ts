export type TipoSector = "URBANO" | "RURAL";

export type SectorUrbanoRecord = {
  sectorId: string;
  zona: string;
  manzana: string;
};

export type SectorRuralRecord = {
  sectorId: string;
  latitud: number | null;
  longitud: number | null;
  poblacion: number | null;
};

export type CentroPobladoRecord = {
  id: string;
  municipalidadId: string;
  nombre: string;
  codigo: string | null;
  tipo: "URBANO" | "RURAL";
  latitud: number | null;
  longitud: number | null;
  poblacion: number | null;
  activo: boolean;
  archivado: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CentroPobladoFormState = {
  municipalidadId: string;
  nombre: string;
  codigo: string;
  tipo: "URBANO" | "RURAL";
  latitud: string;
  longitud: string;
  poblacion: string;
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
  urbano?: SectorUrbanoRecord | null;
  rural?: SectorRuralRecord | null;
  centroPoblado?: CentroPobladoRecord | null;
};

export type SectorFormState = {
  municipalidadId: string;
  centroPobladoId: string;
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  nombreSector: string;
  tipoSector: TipoSector;
  // Urbano sub-form
  zona: string;
  manzana: string;
  // Rural sub-form
  latitud: string;
  longitud: string;
  poblacion: string;
};
