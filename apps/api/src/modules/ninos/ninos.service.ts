import { HttpError } from "../../shared/http-error.js";
import type {
  NinoCreateInput,
  NinoRecord,
  NinosRepository,
  NinoUpdateInput,
} from "./ninos.types.js";

export class NinosService {
  constructor(
    private readonly repository: NinosRepository & {
      findResponsableById?(id: string): Promise<{ id: string; municipalidadId: string } | null>;
      findSectorById?(id: string): Promise<{ id: string; municipalidadId: string } | null>;
      findActorSocialById?(id: string): Promise<{ id: string; municipalidadId: string; activo: boolean } | null>;
    }
  ) {}

  list(municipalidadId?: string | null, includeArchived?: boolean): Promise<NinoRecord[]> {
    return this.repository.list(municipalidadId, includeArchived);
  }

  async getById(id: string): Promise<NinoRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new HttpError(404, "Niño no encontrado");
    }
    return record;
  }

  async create(input: NinoCreateInput): Promise<NinoRecord> {
    // 1. Validar duplicados de DNI en la misma municipalidad
    if (input.dni && input.dni.trim() !== "") {
      const duplicateDni = await this.repository.findByDni(input.municipalidadId, input.dni);
      if (duplicateDni) {
        throw new HttpError(
          409,
          "Ya existe un niño registrado con ese DNI en esta municipalidad"
        );
      }
    }

    // 2. Validar duplicados de CNV en la misma municipalidad
    if (input.cnv && input.cnv.trim() !== "") {
      const duplicateCnv = await this.repository.findByCnv(input.municipalidadId, input.cnv);
      if (duplicateCnv) {
        throw new HttpError(
          409,
          "Ya existe un niño registrado con ese CNV en esta municipalidad"
        );
      }
    }

    // 3. Validar referencias
    if (this.repository.findResponsableById) {
      const resp = await this.repository.findResponsableById(input.responsableId);
      if (!resp) {
        throw new HttpError(404, "Responsable no encontrado");
      }
      if (resp.municipalidadId !== input.municipalidadId) {
        throw new HttpError(
          400,
          "El responsable no pertenece a la municipalidad indicada"
        );
      }
    }

    if (input.sectorId && this.repository.findSectorById) {
      const sector = await this.repository.findSectorById(input.sectorId);
      if (!sector) {
        throw new HttpError(404, "Sector geográfico no encontrado");
      }
      if (sector.municipalidadId !== input.municipalidadId) {
        throw new HttpError(
          400,
          "El sector geográfico no pertenece a la municipalidad indicada"
        );
      }
    }

    return this.repository.create({
      ...input,
      activo: true,
      archivado: false,
    });
  }

  async update(id: string, input: NinoUpdateInput): Promise<NinoRecord> {
    const existing = await this.getById(id);

    // 1. Validar duplicados de DNI
    if (input.dni && input.dni.trim() !== "" && existing.dni !== input.dni) {
      const duplicateDni = await this.repository.findByDni(existing.municipalidadId, input.dni);
      if (duplicateDni && duplicateDni.id !== id) {
        throw new HttpError(
          409,
          "Ya existe otro niño registrado con ese DNI en esta municipalidad"
        );
      }
    }

    // 2. Validar duplicados de CNV
    if (input.cnv && input.cnv.trim() !== "" && existing.cnv !== input.cnv) {
      const duplicateCnv = await this.repository.findByCnv(existing.municipalidadId, input.cnv);
      if (duplicateCnv && duplicateCnv.id !== id) {
        throw new HttpError(
          409,
          "Ya existe otro niño registrado con ese CNV en esta municipalidad"
        );
      }
    }

    // 3. Validar referencias
    if (this.repository.findResponsableById) {
      const resp = await this.repository.findResponsableById(input.responsableId);
      if (!resp) {
        throw new HttpError(404, "Responsable no encontrado");
      }
      if (resp.municipalidadId !== existing.municipalidadId) {
        throw new HttpError(
          400,
          "El responsable no pertenece a la municipalidad del niño"
        );
      }
    }

    if (input.sectorId && this.repository.findSectorById) {
      const sector = await this.repository.findSectorById(input.sectorId);
      if (!sector) {
        throw new HttpError(404, "Sector geográfico no encontrado");
      }
      if (sector.municipalidadId !== existing.municipalidadId) {
        throw new HttpError(
          400,
          "El sector geográfico no pertenece a la municipalidad del niño"
        );
      }
    }

    return this.repository.update(id, input);
  }

  async setActivo(id: string, activo: boolean): Promise<NinoRecord> {
    await this.getById(id);
    return this.repository.setActivo(id, activo);
  }

  async archive(id: string): Promise<NinoRecord> {
    await this.getById(id);
    return this.repository.archive(id);
  }

  async unarchive(id: string): Promise<NinoRecord> {
    await this.getById(id);
    return this.repository.unarchive(id);
  }

  // Lógica de Asignación de Niños a Actores Sociales
  async asignarActorSocial(
    ninoId: string,
    actorSocialId: string,
    asignadoPorId: string,
    motivo: string
  ): Promise<any> {
    const nino = await this.getById(ninoId);

    if (this.repository.findActorSocialById) {
      const actor = await this.repository.findActorSocialById(actorSocialId);
      if (!actor) {
        throw new HttpError(404, "Actor social no encontrado");
      }
      if (actor.municipalidadId !== nino.municipalidadId) {
        throw new HttpError(
          400,
          "El actor social pertenece a otra municipalidad"
        );
      }
      if (!actor.activo) {
        throw new HttpError(
          400,
          "No se puede asignar un niño a un actor social inactivo"
        );
      }
    }

    if (!motivo || !motivo.trim()) {
      throw new HttpError(
        400,
        "Debe indicar el motivo detallado de la asignación o transferencia"
      );
    }

    return this.repository.crearAsignacion(ninoId, actorSocialId, asignadoPorId, motivo.trim());
  }

  async desasignarActorSocial(ninoId: string): Promise<void> {
    await this.getById(ninoId);
    await this.repository.desactivarAsignacionActiva(ninoId);
  }

  async listHistorialAsignaciones(ninoId: string): Promise<any[]> {
    await this.getById(ninoId);
    return this.repository.listHistorialAsignaciones(ninoId);
  }
}
