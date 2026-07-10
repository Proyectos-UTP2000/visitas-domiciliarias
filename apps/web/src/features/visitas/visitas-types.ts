import type { NinoRecord } from "../ninos/ninos-types";

export type EstadoVisita = "PROGRAMADA" | "EJECUTADA" | "REPROGRAMADA" | "INCONCLUSA";

export type VisitaDomiciliariaRecord = {
  id: string;
  ninoId: string;
  actorSocialId: string;
  fechaProgramada: string;
  fechaEjecucion: string | null;
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
  createdAt: string;
  updatedAt: string;
  nino?: NinoRecord;
  actorSocial?: {
    id: string;
    nombres: string;
    apellidos: string;
    dni: string;
    celular: string | null;
  };
};

export type ProgramarVisitaFormState = {
  ninoId: string;
  actorSocialId: string;
  fechaProgramada: string;
};

export type EjecutarVisitaFormState = {
  fechaEjecucion: string;
  peso: string; // lo convertimos a number en la api
  hierroEntregado: boolean;
  consejeriaBrindada: boolean;
  alertas: string;
  comentarios: string;
  tipoRegistro: string;
  latitud: string;
  longitud: string;
  evidenciaUrl: string;
};
