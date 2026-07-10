import { HttpError } from "../../shared/http-error.js";
import type {
  EstadoVisita,
  VisitaDomiciliariaRecord,
  VisitasRepository,
  VisitaProgramarInput,
  VisitaEjecutarInput,
} from "./visitas.types.js";

export class VisitasService {
  constructor(private readonly repository: VisitasRepository) {}

  list(filters: {
    municipalidadId?: string | null;
    actorSocialId?: string | null;
    ninoId?: string | null;
    estado?: EstadoVisita | null;
  }): Promise<VisitaDomiciliariaRecord[]> {
    return this.repository.list(filters);
  }

  async getById(id: string): Promise<VisitaDomiciliariaRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new HttpError(404, "Visita domiciliaria no encontrada");
    }
    return record;
  }

  async programar(input: VisitaProgramarInput): Promise<VisitaDomiciliariaRecord> {
    // 1. Validar niño
    const nino = await this.repository.findNinoById(input.ninoId);
    if (!nino) {
      throw new HttpError(404, "Niño no encontrado");
    }
    if (!nino.activo) {
      throw new HttpError(400, "El niño debe estar activo para programar visitas");
    }

    // 2. Validar actor social
    const actor = await this.repository.findActorById(input.actorSocialId);
    if (!actor) {
      throw new HttpError(404, "Actor social no encontrado");
    }
    if (!actor.activo) {
      throw new HttpError(400, "El actor social debe estar activo para programar visitas");
    }

    // 3. Validar municipalidad
    if (nino.municipalidadId !== actor.municipalidadId) {
      throw new HttpError(400, "El niño y el actor social deben pertenecer a la misma municipalidad");
    }

    const dateProgramada = new Date(input.fechaProgramada);

    const birthDate = new Date(nino.fechaNac);
    birthDate.setUTCHours(0, 0, 0, 0);
    if (dateProgramada.getTime() < birthDate.getTime()) {
      throw new HttpError(400, "La fecha programada no puede ser anterior a la fecha de nacimiento del niño");
    }

    // 4. Validar duplicado en el mismo día
    const listDay = await this.repository.list({
      ninoId: input.ninoId,
      estado: "PROGRAMADA",
    });
    const existsSameDay = listDay.some(
      (v) => v.fechaProgramada.toISOString().split("T")[0] === dateProgramada.toISOString().split("T")[0]
    );
    if (existsSameDay) {
      throw new HttpError(409, "Ya existe una visita programada para este niño en el mismo día");
    }

    return this.repository.create({
      ninoId: input.ninoId,
      actorSocialId: input.actorSocialId,
      fechaProgramada: dateProgramada,
      estado: "PROGRAMADA",
    });
  }

  async programarBulk(visitas: VisitaProgramarInput[]): Promise<VisitaDomiciliariaRecord[]> {
    const validatedList: { ninoId: string; actorSocialId: string; fechaProgramada: Date; estado: EstadoVisita }[] = [];

    for (const v of visitas) {
      const nino = await this.repository.findNinoById(v.ninoId);
      if (!nino) {
        throw new HttpError(404, `Niño no encontrado para la visita`);
      }
      if (!nino.activo) {
        throw new HttpError(400, `El niño debe estar activo para programar visitas`);
      }

      const actor = await this.repository.findActorById(v.actorSocialId);
      if (!actor) {
        throw new HttpError(404, `Actor social no encontrado`);
      }
      if (!actor.activo) {
        throw new HttpError(400, `El actor social debe estar activo para programar visitas`);
      }

      if (nino.municipalidadId !== actor.municipalidadId) {
        throw new HttpError(400, "El niño y el actor social deben pertenecer a la misma municipalidad");
      }

      const dateProgramada = new Date(v.fechaProgramada);

      const birthDate = new Date(nino.fechaNac);
      birthDate.setUTCHours(0, 0, 0, 0);
      if (dateProgramada.getTime() < birthDate.getTime()) {
        throw new HttpError(400, `La fecha programada no puede ser anterior a la fecha de nacimiento del niño (${nino.apellidos}, ${nino.nombres})`);
      }

      const listDay = await this.repository.list({
        ninoId: v.ninoId,
        estado: "PROGRAMADA",
      });
      const existsSameDayDb = listDay.some(
        (ex) => ex.fechaProgramada.toISOString().split("T")[0] === dateProgramada.toISOString().split("T")[0]
      );
      const existsSameDayLocal = validatedList.some(
        (ex) => ex.ninoId === v.ninoId && ex.fechaProgramada.toISOString().split("T")[0] === dateProgramada.toISOString().split("T")[0]
      );
      if (existsSameDayDb || existsSameDayLocal) {
        throw new HttpError(409, `Ya existe una visita programada para este niño en el mismo día (${dateProgramada.toISOString().split("T")[0]})`);
      }

      validatedList.push({
        ninoId: v.ninoId,
        actorSocialId: v.actorSocialId,
        fechaProgramada: dateProgramada,
        estado: "PROGRAMADA",
      });
    }

    return this.repository.createBulk(validatedList);
  }

  async ejecutar(id: string, input: VisitaEjecutarInput): Promise<VisitaDomiciliariaRecord> {
    const existing = await this.getById(id);

    if (existing.estado !== "PROGRAMADA" && existing.estado !== "REPROGRAMADA") {
      throw new HttpError(400, `No se puede ejecutar una visita en estado ${existing.estado}`);
    }

    return this.repository.updateEstado(id, "EJECUTADA", {
      fechaEjecucion: new Date(input.fechaEjecucion),
      peso: input.peso ?? null,
      hierroEntregado: input.hierroEntregado ?? null,
      consejeriaBrindada: input.consejeriaBrindada ?? null,
      alertas: input.alertas || null,
      comentarios: input.comentarios || null,
      tipoRegistro: input.tipoRegistro || null,
      latitud: input.latitud || null,
      longitud: input.longitud || null,
      evidenciaUrl: input.evidenciaUrl || null,
    });
  }

  async marcarInconclusa(id: string, motivoInconclusa: string): Promise<VisitaDomiciliariaRecord> {
    const existing = await this.getById(id);

    if (existing.estado !== "PROGRAMADA" && existing.estado !== "REPROGRAMADA") {
      throw new HttpError(
        400,
        `No se puede marcar como inconclusa una visita en estado ${existing.estado}`
      );
    }

    return this.repository.updateEstado(id, "INCONCLUSA", { motivoInconclusa });
  }

  async reprogramar(
    id: string,
    nuevaFechaProgramada: string | Date,
    motivo: string
  ): Promise<{ vieja: VisitaDomiciliariaRecord; nueva: VisitaDomiciliariaRecord }> {
    const existing = await this.getById(id);

    if (
      existing.estado !== "PROGRAMADA" &&
      existing.estado !== "REPROGRAMADA" &&
      existing.estado !== "INCONCLUSA"
    ) {
      throw new HttpError(
        400,
        `No se puede reprogramar una visita en estado ${existing.estado}`
      );
    }

    const dateReprog = new Date(nuevaFechaProgramada);

    return this.repository.reprogramarVisita(id, motivo, dateReprog);
  }
}
