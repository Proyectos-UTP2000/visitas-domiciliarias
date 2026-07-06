import { apiRequest } from "../../shared/api";

export type DniDatosRecord = {
  dni: string;
  nombres: string;
  ape_paterno: string;
  ape_materno: string;
  domiciliado?: {
    direccion?: string;
    distrito?: string;
    provincia?: string;
    departamento?: string;
    ubigeo?: string;
  };
};

export function consultarDni(dni: string): Promise<DniDatosRecord> {
  return apiRequest<DniDatosRecord>(`/dni/${dni}`);
}
