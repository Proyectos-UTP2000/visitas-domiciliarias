import { HttpError } from "../../shared/http-error.js";
import type {
  GrupoEstablecimientoCreateInput,
  GrupoEstablecimientoRecord,
  GrupoTrabajoArchivoRecord,
  GrupoTrabajoCreateInput,
  GrupoTrabajoRecord,
  GrupoTrabajoRecordWithRelations,
  GruposTrabajoRepository,
  MiembroGrupoContactoInput,
  MiembroGrupoCreateInput,
  MiembroGrupoDeleteInput,
  MiembroGrupoDeleteResult,
  MiembroGrupoRecord,
} from "./grupos-trabajo.types.js";

const NOTIFICATION_MESSAGE =
  "Se notificó al administrador general para su revisión.";

export class GruposTrabajoService {
  constructor(private readonly repository: GruposTrabajoRepository) {}

  list(municipalidadId: string | null): Promise<GrupoTrabajoRecord[]> {
    return this.repository.list(municipalidadId);
  }

  async getGrupoById(id: string): Promise<GrupoTrabajoRecordWithRelations> {
    const grupo = await this.repository.findFullGrupoById(id);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    return grupo;
  }

  async createGrupo(input: GrupoTrabajoCreateInput): Promise<GrupoTrabajoRecord> {
    const existingGroups = await this.repository.list(input.municipalidadId);
    const duplicate = existingGroups.find(
      (g) => g.dniRepresentante === input.dniRepresentante && g.periodoYear === input.periodoYear
    );
    if (duplicate) {
      throw new HttpError(400, "El DNI del representante ya está registrado para este periodo");
    }

    return this.repository.createGrupo({
      ...input,
      fechaLimite: normalizeDate(input.fechaLimite),
      estado: "BORRADOR",
      activo: true,
      archivado: false,
    });
  }

  async updateGrupo(
    id: string,
    input: Partial<GrupoTrabajoCreateInput>
  ): Promise<GrupoTrabajoRecord> {
    const existing = await this.repository.findFullGrupoById(id);
    if (!existing) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }

    if (existing.estado !== "BORRADOR" && existing.estado !== "REGISTRADO") {
      throw new HttpError(400, "Solo se pueden editar grupos de trabajo en estado borrador o registrado");
    }

    if (existing.estado === "REGISTRADO") {
      if (input.dniRepresentante !== undefined && input.dniRepresentante !== existing.dniRepresentante) {
        throw new HttpError(400, "No se puede editar el DNI del representante en estado registrado");
      }
      if (input.periodoYear !== undefined && input.periodoYear !== existing.periodoYear) {
        throw new HttpError(400, "No se puede editar el periodo en estado registrado");
      }
    }

    if (input.dniRepresentante !== undefined || input.periodoYear !== undefined) {
      const period = input.periodoYear ?? existing.periodoYear;
      const dni = input.dniRepresentante ?? existing.dniRepresentante;

      const siblingGroups = await this.repository.list(existing.municipalidadId);
      const duplicate = siblingGroups.find(
        (g) => g.id !== id && g.dniRepresentante === dni && g.periodoYear === period
      );
      if (duplicate) {
        throw new HttpError(400, "El DNI del representante ya está registrado para este periodo");
      }
    }

    const updateData: Partial<GrupoTrabajoCreateInput> = { ...input };
    if (input.fechaLimite) {
      updateData.fechaLimite = normalizeDate(input.fechaLimite);
    }

    return this.repository.updateGrupo(id, updateData);
  }

  async createEstablecimiento(
    grupoTrabajoId: string,
    input: GrupoEstablecimientoCreateInput,
  ): Promise<GrupoEstablecimientoRecord> {
    const grupo = await this.repository.findGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    this.ensureEstablecimientosOrMiembrosEditable(grupo.estado);

    return this.repository.createEstablecimiento({
      grupoTrabajoId,
      ...input,
      codigo: input.codigo ?? null,
      direccion: input.direccion ?? null,
      activo: true,
    });
  }

  async createMiembro(
    grupoTrabajoId: string,
    input: MiembroGrupoCreateInput,
  ): Promise<MiembroGrupoRecord> {
    const grupo = await this.repository.findFullGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    this.ensureEstablecimientosOrMiembrosEditable(grupo.estado);

    const duplicate = grupo.miembros.find((m) => m.dni === input.dni);
    if (duplicate) {
      throw new HttpError(400, "El miembro con este DNI ya está registrado en este grupo de trabajo");
    }

    await this.ensureCargoExists(input.cargoMiembroGrupoId);
    await this.ensureEstablecimientoBelongsToGrupo(
      grupoTrabajoId,
      input.grupoEstablecimientoId ?? null,
    );

    return this.repository.createMiembro({
      grupoTrabajoId,
      ...input,
      grupoEstablecimientoId: input.grupoEstablecimientoId ?? null,
      celular: input.celular ?? null,
      email: input.email ?? null,
      activo: true,
      archivado: false,
    });
  }

  async updateMiembroContacto(
    grupoTrabajoId: string,
    miembroId: string,
    input: MiembroGrupoContactoInput,
  ): Promise<MiembroGrupoRecord> {
    const grupo = await this.repository.findGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    this.ensureEstablecimientosOrMiembrosEditable(grupo.estado);

    await this.ensureEstablecimientoBelongsToGrupo(
      grupoTrabajoId,
      input.grupoEstablecimientoId ?? null,
    );

    return this.repository.updateMiembroContacto(grupoTrabajoId, miembroId, {
      grupoEstablecimientoId: input.grupoEstablecimientoId ?? null,
      celular: input.celular ?? null,
      email: input.email ?? null,
    });
  }

  async setMiembroActivo(
    grupoTrabajoId: string,
    miembroId: string,
    activo: boolean,
  ): Promise<MiembroGrupoRecord> {
    const grupo = await this.repository.findGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    this.ensureEstablecimientosOrMiembrosEditable(grupo.estado);

    return this.repository.setMiembroActivo(grupoTrabajoId, miembroId, activo);
  }

  async deleteMiembro(
    grupoTrabajoId: string,
    miembroId: string,
    input: MiembroGrupoDeleteInput,
  ): Promise<MiembroGrupoDeleteResult> {
    const grupo = await this.repository.findGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    this.ensureEstablecimientosOrMiembrosEditable(grupo.estado);

    const motivoEliminacion = input.motivoEliminacion.trim();
    if (!motivoEliminacion) {
      throw new HttpError(400, "El motivo de eliminación es obligatorio");
    }

    const record = await this.repository.deleteMiembro(
      grupoTrabajoId,
      miembroId,
      {
        motivoEliminacion,
      },
    );

    return { ...record, notificationMessage: NOTIFICATION_MESSAGE };
  }

  async updateGrupoEstado(
    id: string,
    estado: any,
    observaciones?: string | null,
  ): Promise<GrupoTrabajoRecord> {
    if (estado === "REGISTRADO" && observaciones !== undefined && observaciones !== null && !observaciones.trim()) {
      throw new HttpError(400, "Las observaciones son obligatorias para observar el grupo de trabajo");
    }
    return this.repository.updateGrupoEstado(id, estado, observaciones?.trim() || null);
  }

  async listArchivos(grupoTrabajoId: string): Promise<GrupoTrabajoArchivoRecord[]> {
    const grupo = await this.repository.findGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    return this.repository.listArchivos(grupoTrabajoId);
  }

  async createArchivo(
    grupoTrabajoId: string,
    data: {
      nombreArchivo: string;
      rutaArchivo: string;
      mimeType: string;
    }
  ): Promise<GrupoTrabajoArchivoRecord> {
    const grupo = await this.repository.findGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    this.ensureArchivosEditable(grupo.estado);
    return this.repository.createArchivo({
      grupoTrabajoId,
      ...data,
    });
  }

  async getArchivoById(archivoId: string): Promise<GrupoTrabajoArchivoRecord> {
    const archivo = await this.repository.findArchivoById(archivoId);
    if (!archivo) {
      throw new HttpError(404, "Archivo no encontrado");
    }
    return archivo;
  }

  async deleteArchivo(grupoTrabajoId: string, archivoId: string): Promise<GrupoTrabajoArchivoRecord> {
    const grupo = await this.repository.findGrupoById(grupoTrabajoId);
    if (!grupo) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }
    this.ensureArchivosEditable(grupo.estado);
    const archivo = await this.getArchivoById(archivoId);
    if (archivo.grupoTrabajoId !== grupoTrabajoId) {
      throw new HttpError(400, "El archivo no pertenece al grupo de trabajo indicado");
    }
    return this.repository.deleteArchivo(archivoId);
  }

  private ensureEstablecimientosOrMiembrosEditable(estado: string): void {
    if (estado !== "APROBADO") {
      throw new HttpError(400, "Los establecimientos y miembros solo se pueden modificar en un grupo de trabajo aprobado");
    }
  }

  private ensureArchivosEditable(estado: string): void {
    if (estado !== "REGISTRADO" && estado !== "APROBADO") {
      throw new HttpError(400, "Los archivos solo se pueden modificar en un grupo de trabajo en estado registrado o aprobado");
    }
  }

  private async ensureCargoExists(cargoMiembroGrupoId: string): Promise<void> {
    if (!(await this.repository.findCargoById(cargoMiembroGrupoId))) {
      throw new HttpError(404, "Cargo de miembro de grupo no encontrado");
    }
  }

  private async ensureEstablecimientoBelongsToGrupo(
    grupoTrabajoId: string,
    grupoEstablecimientoId: string | null,
  ): Promise<void> {
    if (!grupoEstablecimientoId) return;

    const establecimiento = await this.repository.findEstablecimientoById(
      grupoEstablecimientoId,
    );

    if (!establecimiento) {
      throw new HttpError(404, "Establecimiento del grupo no encontrado");
    }

    if (establecimiento.grupoTrabajoId !== grupoTrabajoId) {
      throw new HttpError(
        400,
        "El establecimiento no pertenece al grupo de trabajo indicado",
      );
    }
  }

  async deleteGrupo(id: string, userMuniId: string | null): Promise<void> {
    const existing = await this.repository.findGrupoById(id);
    if (!existing) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }

    if (userMuniId && existing.municipalidadId !== userMuniId) {
      throw new HttpError(403, "No tiene permisos para eliminar este grupo de trabajo");
    }

    if (existing.estado !== "BORRADOR" && existing.estado !== "REGISTRADO") {
      throw new HttpError(400, "Solo se pueden eliminar grupos de trabajo en estado borrador o registrado");
    }

    await this.repository.deleteGrupo(id);
  }

  async archivarGrupo(id: string, userMuniId: string | null): Promise<GrupoTrabajoRecord> {
    const existing = await this.repository.findGrupoById(id);
    if (!existing) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }

    if (userMuniId && existing.municipalidadId !== userMuniId) {
      throw new HttpError(403, "No tiene permisos para archivar este grupo de trabajo");
    }

    if (existing.estado !== "VALIDADO" && existing.estado !== "APROBADO") {
      throw new HttpError(400, "Solo se pueden archivar grupos de trabajo en estado aprobado o validado");
    }

    return this.repository.archivarGrupo(id);
  }
}

function normalizeDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(`${value}T00:00:00.000Z`);
}
