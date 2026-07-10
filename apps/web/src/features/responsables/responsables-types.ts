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
  createdAt: string;
  updatedAt: string;
};

export type ResponsableFormState = {
  municipalidadId: string;
  tipoDocumento: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string;
  email: string;
};
