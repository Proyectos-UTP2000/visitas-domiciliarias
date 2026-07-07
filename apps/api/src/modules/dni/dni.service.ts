import { HttpError } from "../../shared/http-error.js";

export class DniService {
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor() {
    this.apiUrl = process.env.DNI_API_URL || "https://miapi.cloud/v1/dni/";
    this.apiToken = process.env.DNI_API_TOKEN || "";
  }

  async consultarDni(dni: string) {
    if (!/^\d{8}$/.test(dni)) {
      throw new HttpError(400, "El DNI debe tener exactamente 8 dígitos numéricos");
    }

    try {
      const url = `${this.apiUrl.endsWith("/") ? this.apiUrl : this.apiUrl + "/"}${dni}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new HttpError(502, `Error al consultar el servicio externo de DNI (código: ${response.status})`);
      }

      const data = (await response.json()) as any;
      if (!data || !data.success) {
        throw new HttpError(400, data?.message || "DNI no encontrado o error en la consulta");
      }

      return data.datos;
    } catch (error: any) {
      console.error(`[DniService] Error al consultar DNI ${dni}:`, error);

      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(502, `Error de conexión con la API de DNI: ${error.message}`);
    }
  }
}
