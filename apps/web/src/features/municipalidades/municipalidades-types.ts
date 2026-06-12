export type TipoMunicipalidad = "PROVINCIAL" | "DISTRITAL";

export type MunicipalidadRecord = {
  id: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  codigo: string;
  nombre: string;
  tipo: TipoMunicipalidad;
  prioridad: number;
  activo: boolean;
  archivado: boolean;
};

export type MunicipalidadPayload = {
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  codigo: string;
  nombre: string;
  tipo: TipoMunicipalidad;
  prioridad: number;
};

export type MunicipalidadFormState = Omit<
  MunicipalidadPayload,
  "prioridad"
> & {
  prioridad: string;
};
