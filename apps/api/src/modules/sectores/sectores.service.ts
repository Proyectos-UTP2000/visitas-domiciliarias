import { HttpError } from "../../shared/http-error.js";
import type {
  SectorCreateData,
  SectorPayload,
  SectorRecord,
  SectoresRepository,
} from "./sectores.types.js";

export class SectoresService {
  constructor(
    private readonly repository: SectoresRepository & {
      findCentroPobladoById?(id: string): Promise<{ id: string } | null>;
    }
  ) {}

  list(municipalidadId?: string | null): Promise<SectorRecord[]> {
    return this.repository.list(municipalidadId);
  }

  async create(input: SectorPayload): Promise<SectorRecord> {
    this.ensureTipoMatchesDetail(input);

    if (this.repository.findCentroPobladoById) {
      const cp = await this.repository.findCentroPobladoById(input.centroPobladoId);
      if (!cp) {
        throw new HttpError(404, "Centro Poblado no encontrado");
      }
    }

    const existing = await this.repository.findByMunicipalidadAndCodigo(
      input.municipalidadId,
      input.codigo,
    );

    if (existing) {
      throw new HttpError(
        409,
        "Ya existe un sector con ese código en la municipalidad",
      );
    }

    const data: SectorCreateData = {
      ...input,
      activo: true,
      archivado: false,
    };

    return this.repository.create(data);
  }

  async update(id: string, input: SectorPayload): Promise<SectorRecord> {
    await this.ensureExists(id);
    this.ensureTipoMatchesDetail(input);

    if (this.repository.findCentroPobladoById) {
      const cp = await this.repository.findCentroPobladoById(input.centroPobladoId);
      if (!cp) {
        throw new HttpError(404, "Centro Poblado no encontrado");
      }
    }

    return this.repository.update(id, input);
  }

  async setActivo(id: string, activo: boolean): Promise<SectorRecord> {
    await this.ensureExists(id);
    return this.repository.setActivo(id, activo);
  }

  async archive(id: string): Promise<SectorRecord> {
    await this.ensureExists(id);
    return this.repository.archive(id);
  }

  async getById(id: string) {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new HttpError(404, "Sector no encontrado");
    }
    return record;
  }

  private async ensureExists(id: string): Promise<void> {
    await this.getById(id);
  }

  private ensureTipoMatchesDetail(input: SectorPayload): void {
    if (input.tipoSector === "URBANO") {
      if (!input.urbano || input.rural) {
        throw new HttpError(
          400,
          "Un sector urbano debe tener solo datos urbanos",
        );
      }
      return;
    }

    if (!input.rural || input.urbano) {
      throw new HttpError(400, "Un sector rural debe tener solo datos rurales");
    }
  }
}
