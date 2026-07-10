export type ResponsableRecord = {
  id: string;
  municipalidadId: string;
  tipoDocumento: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  email: string | null;
  activo: boolean;
  archivado: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ResponsableCreateInput = {
  municipalidadId: string;
  tipoDocumento: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular?: string | null;
  email?: string | null;
};

export type ResponsableUpdateInput = Omit<ResponsableCreateInput, "municipalidadId">;

export type ResponsablesRepository = {
  list(municipalidadId?: string | null): Promise<ResponsableRecord[]>;
  findById(id: string): Promise<ResponsableRecord | null>;
  findByDni(
    municipalidadId: string,
    tipoDocumento: string,
    dni: string
  ): Promise<ResponsableRecord | null>;
  create(
    data: ResponsableCreateInput & { activo: boolean; archivado: boolean }
  ): Promise<ResponsableRecord>;
  update(id: string, data: ResponsableUpdateInput): Promise<ResponsableRecord>;
  setActivo(id: string, activo: boolean): Promise<ResponsableRecord>;
  archive(id: string): Promise<ResponsableRecord>;
};
