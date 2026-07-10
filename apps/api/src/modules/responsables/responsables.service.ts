import { HttpError } from "../../shared/http-error.js";
import type {
  ResponsableCreateInput,
  ResponsableRecord,
  ResponsablesRepository,
  ResponsableUpdateInput,
} from "./responsables.types.js";

export class ResponsablesService {
  constructor(private readonly repository: ResponsablesRepository) {}

  list(municipalidadId?: string | null): Promise<ResponsableRecord[]> {
    return this.repository.list(municipalidadId);
  }

  async getById(id: string): Promise<ResponsableRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new HttpError(404, "Responsable no encontrado");
    }
    return record;
  }

  async create(input: ResponsableCreateInput): Promise<ResponsableRecord> {
    const existing = await this.repository.findByDni(
      input.municipalidadId,
      input.tipoDocumento,
      input.dni
    );

    if (existing) {
      throw new HttpError(
        409,
        "Ya existe un responsable registrado con ese mismo documento en esta municipalidad"
      );
    }

    return this.repository.create({
      ...input,
      activo: true,
      archivado: false,
    });
  }

  async update(id: string, input: ResponsableUpdateInput): Promise<ResponsableRecord> {
    const existing = await this.getById(id);

    // Si cambia el documento, validar que no esté duplicado
    if (existing.tipoDocumento !== input.tipoDocumento || existing.dni !== input.dni) {
      const duplicate = await this.repository.findByDni(
        existing.municipalidadId,
        input.tipoDocumento,
        input.dni
      );
      if (duplicate && duplicate.id !== id) {
        throw new HttpError(
          409,
          "Ya existe otro responsable registrado con ese mismo documento en esta municipalidad"
        );
      }
    }

    return this.repository.update(id, input);
  }

  async setActivo(id: string, activo: boolean): Promise<ResponsableRecord> {
    await this.getById(id);
    return this.repository.setActivo(id, activo);
  }

  async archive(id: string): Promise<ResponsableRecord> {
    await this.getById(id);
    return this.repository.archive(id);
  }
}
