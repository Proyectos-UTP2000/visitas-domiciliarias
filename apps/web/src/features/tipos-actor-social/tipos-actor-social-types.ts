export type TipoActorSocialRecord = {
  id: string;
  tipoActor: string;
  tarifaRural: number;
  tarifaUrbana: number;
  orden: number;
  codigo: string;
  activo: boolean;
  archivado: boolean;
};

export type TipoActorSocialFormState = {
  tipoActor: string;
  tarifaRural: string;
  tarifaUrbana: string;
  orden: string;
  codigo: string;
};
