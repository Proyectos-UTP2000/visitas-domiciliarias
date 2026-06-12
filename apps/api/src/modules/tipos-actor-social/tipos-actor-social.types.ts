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
export type TipoActorSocialCreateInput = Omit<
  TipoActorSocialRecord,
  "id" | "activo" | "archivado"
>;
export type TipoActorSocialUpdateInput = TipoActorSocialCreateInput;
export type TiposActorSocialRepository = {
  list(): Promise<TipoActorSocialRecord[]>;
  findById(id: string): Promise<TipoActorSocialRecord | { id: string } | null>;
  findByCodigo(
    codigo: string,
  ): Promise<TipoActorSocialRecord | { id: string } | null>;
  create(
    data: TipoActorSocialCreateInput & { activo: true; archivado: false },
  ): Promise<TipoActorSocialRecord>;
  update(
    id: string,
    data: TipoActorSocialUpdateInput,
  ): Promise<TipoActorSocialRecord>;
  setActivo(id: string, activo: boolean): Promise<TipoActorSocialRecord>;
  archive(id: string): Promise<TipoActorSocialRecord>;
};
