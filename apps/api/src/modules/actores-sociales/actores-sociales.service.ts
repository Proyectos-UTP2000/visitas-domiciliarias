import { HttpError } from "../../shared/http-error.js";
import { hashPassword } from "../../shared/password.js";
import type {
  ActorSocialCreateInput,
  ActorSocialRecord,
  ActorSocialUpdateInput,
  ActoresSocialesRepository,
  EstadoActorSocial,
} from "./actores-sociales.types.js";

const NOTIFICATION_MESSAGE =
  "Se notificó al administrador general para su revisión.";

export class ActoresSocialesService {
  constructor(
    private readonly repository: ActoresSocialesRepository & {
      findMunicipalidadById?(id: string): Promise<{ id: string } | null>;
      findTipoActorById?(id: string): Promise<{ id: string } | null>;
      findGrupoById?(id: string): Promise<{ id: string; municipalidadId: string } | null>;
      findEntidadById?(id: string): Promise<{ id: string } | null>;
      findEstablecimientoById?(id: string): Promise<{ id: string; grupoTrabajoId: string } | null>;
      findCentroPobladoById?(id: string): Promise<{ id: string; municipalidadId: string } | null>;
    }
  ) {}

  async list(municipalidadId?: string | null): Promise<ActorSocialRecord[]> {
    return this.repository.list(municipalidadId);
  }

  async getById(id: string): Promise<ActorSocialRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new HttpError(404, "Actor social no encontrado");
    }
    return record;
  }

  async create(input: ActorSocialCreateInput): Promise<ActorSocialRecord> {
    // 1. DNI uniqueness within municipality
    const duplicateDni = await this.repository.findByDni(input.municipalidadId, input.dni);
    if (duplicateDni) {
      throw new HttpError(
        409,
        "Ya existe un actor social con ese DNI en esta municipalidad"
      );
    }

    // 2. Global username uniqueness
    const duplicateUsername = await this.repository.findByUsername(input.username);
    if (duplicateUsername) {
      throw new HttpError(
        409,
        "El nombre de usuario ya está registrado en el sistema"
      );
    }

    // 3. Verify references exist
    if (this.repository.findMunicipalidadById) {
      const mun = await this.repository.findMunicipalidadById(input.municipalidadId);
      if (!mun) throw new HttpError(404, "Municipalidad no encontrada");
    }
    if (this.repository.findTipoActorById) {
      const ta = await this.repository.findTipoActorById(input.tipoActorSocialId);
      if (!ta) throw new HttpError(404, "Tipo de actor social no encontrado");
    }
    if (this.repository.findGrupoById) {
      const gt = await this.repository.findGrupoById(input.grupoTrabajoId);
      if (!gt) {
        throw new HttpError(404, "Grupo de trabajo no encontrado");
      }
      if (gt.municipalidadId !== input.municipalidadId) {
        throw new HttpError(
          400,
          "El grupo de trabajo no pertenece a la municipalidad indicada"
        );
      }
    }
    if (input.grupoEstablecimientoId && this.repository.findEstablecimientoById) {
      const est = await this.repository.findEstablecimientoById(input.grupoEstablecimientoId);
      if (!est) {
        throw new HttpError(404, "Establecimiento de salud no encontrado");
      }
      if (est.grupoTrabajoId !== input.grupoTrabajoId) {
        throw new HttpError(
          400,
          "El establecimiento de salud no pertenece al grupo de trabajo indicado"
        );
      }
    }
    if (input.centroPobladoId && this.repository.findCentroPobladoById) {
      const cp = await this.repository.findCentroPobladoById(input.centroPobladoId);
      if (!cp) {
        throw new HttpError(404, "Centro Poblado no encontrado");
      }
      if (cp.municipalidadId !== input.municipalidadId) {
        throw new HttpError(
          400,
          "El centro poblado no pertenece a la municipalidad indicada"
        );
      }
    }
    if (input.entidadId && this.repository.findEntidadById) {
      const ent = await this.repository.findEntidadById(input.entidadId);
      if (!ent) throw new HttpError(404, "Entidad no encontrada");
    }

    if (input.sectoresIds && input.sectoresIds.length > 0) {
      for (const sectorId of input.sectoresIds) {
        const activeActor = await this.repository.findActiveBySector(sectorId);
        if (activeActor) {
          throw new HttpError(
            400,
            `El sector/manzana ya se encuentra asignado al actor social activo: ${activeActor.nombres} ${activeActor.apellidos}`
          );
        }
      }
    }

    const passwordHash = await hashPassword(input.password);
    const { password, ...createInput } = input;

    return this.repository.create({
      ...createInput,
      passwordHash,
      estado: "BORRADOR",
      activo: true,
      archivado: false,
    });
  }

  async update(id: string, input: ActorSocialUpdateInput): Promise<ActorSocialRecord> {
    const existing = await this.getById(id);

    // Verify references
    if (this.repository.findTipoActorById) {
      const ta = await this.repository.findTipoActorById(input.tipoActorSocialId);
      if (!ta) throw new HttpError(404, "Tipo de actor social no encontrado");
    }
    if (this.repository.findGrupoById) {
      const gt = await this.repository.findGrupoById(input.grupoTrabajoId);
      if (!gt) {
        throw new HttpError(404, "Grupo de trabajo no encontrado");
      }
      if (gt.municipalidadId !== existing.municipalidadId) {
        throw new HttpError(
          400,
          "El grupo de trabajo no pertenece a la municipalidad del actor social"
        );
      }
    }
    if (input.grupoEstablecimientoId && this.repository.findEstablecimientoById) {
      const est = await this.repository.findEstablecimientoById(input.grupoEstablecimientoId);
      if (!est) {
        throw new HttpError(404, "Establecimiento de salud no encontrado");
      }
      const targetGrupoId = input.grupoTrabajoId || existing.grupoTrabajoId;
      if (est.grupoTrabajoId !== targetGrupoId) {
        throw new HttpError(
          400,
          "El establecimiento de salud no pertenece al grupo de trabajo indicado"
        );
      }
    }
    if (input.centroPobladoId && this.repository.findCentroPobladoById) {
      const cp = await this.repository.findCentroPobladoById(input.centroPobladoId);
      if (!cp) {
        throw new HttpError(404, "Centro Poblado no encontrado");
      }
      if (cp.municipalidadId !== existing.municipalidadId) {
        throw new HttpError(
          400,
          "El centro poblado no pertenece a la municipalidad del actor social"
        );
      }
    }
    if (input.entidadId && this.repository.findEntidadById) {
      const ent = await this.repository.findEntidadById(input.entidadId);
      if (!ent) throw new HttpError(404, "Entidad no encontrada");
    }

    if (input.sectoresIds && input.sectoresIds.length > 0) {
      for (const sectorId of input.sectoresIds) {
        const activeActor = await this.repository.findActiveBySector(sectorId, id);
        if (activeActor) {
          throw new HttpError(
            400,
            `El sector/manzana ya se encuentra asignado al actor social activo: ${activeActor.nombres} ${activeActor.apellidos}`
          );
        }
      }
    }

    return this.repository.update(id, input);
  }

  async setActivo(id: string, activo: boolean): Promise<ActorSocialRecord> {
    await this.getById(id);
    return this.repository.setActivo(id, activo);
  }

  async setEstado(id: string, estado: EstadoActorSocial): Promise<ActorSocialRecord> {
    await this.getById(id);
    return this.repository.setEstado(id, estado);
  }

  async archive(id: string): Promise<ActorSocialRecord> {
    await this.getById(id);
    return this.repository.archive(id);
  }

  async delete(
    id: string,
    input: { motivoEliminacion: string }
  ): Promise<ActorSocialRecord & { notificationMessage: string }> {
    await this.getById(id);
    const motivoEliminacion = input.motivoEliminacion.trim();
    if (!motivoEliminacion) {
      throw new HttpError(400, "El motivo de eliminación es obligatorio");
    }

    const record = await this.repository.delete(id, motivoEliminacion);
    return {
      ...record,
      notificationMessage: NOTIFICATION_MESSAGE,
    };
  }
}
