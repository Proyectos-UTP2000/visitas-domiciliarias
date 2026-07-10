import type { ResponsableRecord } from "../responsables/responsables-types";

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
  fechaNac: string;
  direccion: string;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  archivado: boolean;
  createdAt: string;
  updatedAt: string;
  responsable?: ResponsableRecord;
  sector?: {
    id: string;
    nombreSector: string;
    codigo: string;
    tipoSector: string;
    centroPoblado?: {
      nombre: string;
    };
  };
  asignaciones?: {
    id: string;
    actorSocialId: string;
    actorSocial: {
      id: string;
      nombres: string;
      apellidos: string;
      dni: string;
    };
  }[];
};

export type NinoFormState = {
  municipalidadId: string;
  responsableId: string;
  sectorId: string;
  dni: string;
  cnv: string;
  nombres: string;
  apellidos: string;
  sexo: SexoNino;
  fechaNac: string;
  direccion: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
};
