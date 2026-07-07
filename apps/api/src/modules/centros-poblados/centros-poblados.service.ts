import { HttpError } from "../../shared/http-error.js";
import type {
  CentroPobladoCreateInput,
  CentroPobladoRecord,
  CentroPobladoUpdateInput,
  CentrosPobladosRepository,
} from "./centros-poblados.types.js";

export class CentrosPobladosService {
  constructor(
    private readonly repository: CentrosPobladosRepository & {
      findMunicipalidadById?(id: string): Promise<{ id: string } | null>;
    }
  ) {}

  async list(municipalidadId?: string | null): Promise<CentroPobladoRecord[]> {
    return this.repository.list(municipalidadId);
  }

  async getById(id: string): Promise<CentroPobladoRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new HttpError(404, "Centro poblado no encontrado");
    }
    return record;
  }

  async create(input: CentroPobladoCreateInput): Promise<CentroPobladoRecord> {
    // 1. Verify municipalidad exists
    if (this.repository.findMunicipalidadById) {
      const muni = await this.repository.findMunicipalidadById(input.municipalidadId);
      if (!muni) {
        throw new HttpError(404, "Municipalidad no encontrada");
      }
    }

    // 2. Prevent duplicate name + type in the same municipalidad
    const dup = await this.repository.findByNameAndType(input.municipalidadId, input.nombre, input.tipo);
    if (dup) {
      throw new HttpError(
        409,
        `Ya existe un Centro Poblado con el nombre "${input.nombre}" y tipo "${input.tipo}" en esta municipalidad.`
      );
    }

    return this.repository.create(input);
  }

  async update(id: string, input: CentroPobladoUpdateInput): Promise<CentroPobladoRecord> {
    const existing = await this.getById(id);

    // If name changed, verify uniqueness
    if (existing.nombre.toLowerCase() !== input.nombre.toLowerCase()) {
      const dup = await this.repository.findByNameAndType(existing.municipalidadId, input.nombre, existing.tipo);
      if (dup) {
        throw new HttpError(
          409,
          `Ya existe un Centro Poblado con el nombre "${input.nombre}" y tipo "${existing.tipo}" en esta municipalidad.`
        );
      }
    }

    return this.repository.update(id, input);
  }

  async setActivo(id: string, activo: boolean): Promise<CentroPobladoRecord> {
    await this.getById(id);
    return this.repository.setActivo(id, activo);
  }

  async archive(id: string): Promise<CentroPobladoRecord> {
    await this.getById(id);
    return this.repository.archive(id);
  }
}
