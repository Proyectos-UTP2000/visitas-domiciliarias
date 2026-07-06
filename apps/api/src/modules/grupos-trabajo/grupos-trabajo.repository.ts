import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../../shared/http-error.js";
import type {
  EstadoGrupoTrabajo,
  GrupoEstablecimientoCreateInput,
  GrupoEstablecimientoRecord,
  GrupoTrabajoCreateInput,
  GrupoTrabajoRecord,
  GrupoTrabajoRecordWithRelations,
  GruposTrabajoRepository,
  MiembroGrupoContactoInput,
  MiembroGrupoCreateInput,
  MiembroGrupoDeleteInput,
  MiembroGrupoRecord,
} from "./grupos-trabajo.types.js";

export class PrismaGruposTrabajoRepository implements GruposTrabajoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(municipalidadId: string | null): Promise<GrupoTrabajoRecord[]> {
    const where: Prisma.GrupoTrabajoWhereInput = { archivado: false };
    if (municipalidadId) {
      where.municipalidadId = municipalidadId;
    }
    return this.prisma.grupoTrabajo.findMany({
      where,
      orderBy: [{ periodoYear: "desc" }, { nombreGrupo: "asc" }],
      include: {
        establecimientos: true,
        miembros: {
          where: { archivado: false },
        },
        archivos: true,
      },
    }) as unknown as Promise<GrupoTrabajoRecord[]>;
  }

  findGrupoById(id: string): Promise<{ id: string; municipalidadId: string; estado: EstadoGrupoTrabajo } | null> {
    return this.prisma.grupoTrabajo.findUnique({
      where: { id },
      select: { id: true, municipalidadId: true, estado: true },
    });
  }

  findFullGrupoById(id: string): Promise<GrupoTrabajoRecordWithRelations | null> {
    return this.prisma.grupoTrabajo.findUnique({
      where: { id, archivado: false },
      include: {
        establecimientos: true,
        miembros: {
          where: { archivado: false },
        },
        archivos: true,
      },
    }) as unknown as Promise<GrupoTrabajoRecordWithRelations | null>;
  }

  createGrupo(
    data: GrupoTrabajoCreateInput & {
      estado: "BORRADOR";
      activo: true;
      archivado: false;
    },
  ): Promise<GrupoTrabajoRecord> {
    return this.prisma.grupoTrabajo.create({
      data,
    });
  }

  updateGrupo(
    id: string,
    data: Partial<GrupoTrabajoCreateInput>,
  ): Promise<GrupoTrabajoRecord> {
    return this.prisma.grupoTrabajo.update({
      where: { id },
      data,
    }) as unknown as Promise<GrupoTrabajoRecord>;
  }

  findCargoById(id: string): Promise<{ id: string } | null> {
    return this.prisma.cargoMiembroGrupo.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findEstablecimientoById(
    id: string,
  ): Promise<{ id: string; grupoTrabajoId: string } | null> {
    return this.prisma.grupoEstablecimiento.findUnique({
      where: { id },
      select: { id: true, grupoTrabajoId: true },
    });
  }

  createEstablecimiento(
    data: GrupoEstablecimientoCreateInput & {
      grupoTrabajoId: string;
      activo: true;
    },
  ): Promise<GrupoEstablecimientoRecord> {
    return this.prisma.grupoEstablecimiento.create({
      data,
    });
  }

  createMiembro(
    data: MiembroGrupoCreateInput & {
      grupoTrabajoId: string;
      grupoEstablecimientoId?: string | null;
      activo: true;
      archivado: false;
    },
  ): Promise<MiembroGrupoRecord> {
    return this.prisma.miembroGrupo.create({
      data,
    });
  }

  async updateMiembroContacto(
    grupoTrabajoId: string,
    miembroId: string,
    data: MiembroGrupoContactoInput,
  ): Promise<MiembroGrupoRecord> {
    return this.updateExistingMiembro(grupoTrabajoId, miembroId, data);
  }

  async setMiembroActivo(
    grupoTrabajoId: string,
    miembroId: string,
    activo: boolean,
  ): Promise<MiembroGrupoRecord> {
    return this.updateExistingMiembro(grupoTrabajoId, miembroId, { activo });
  }

  async deleteMiembro(
    grupoTrabajoId: string,
    miembroId: string,
    data: MiembroGrupoDeleteInput,
  ): Promise<MiembroGrupoRecord> {
    return this.updateExistingMiembro(grupoTrabajoId, miembroId, {
      archivado: true,
      deletedAt: new Date(),
      motivoEliminacion: data.motivoEliminacion,
    });
  }

  private async updateExistingMiembro(
    grupoTrabajoId: string,
    miembroId: string,
    data: Prisma.MiembroGrupoUpdateInput,
  ): Promise<MiembroGrupoRecord> {
    const existing = await this.prisma.miembroGrupo.findFirst({
      where: { id: miembroId, grupoTrabajoId },
      select: { id: true },
    });

    if (!existing) {
      throw new HttpError(404, "Miembro de grupo no encontrado");
    }

    return this.prisma.miembroGrupo.update({
      where: { id: miembroId },
      data,
    });
  }

  async updateGrupoEstado(
    id: string,
    estado: EstadoGrupoTrabajo,
    observaciones?: string | null,
  ): Promise<GrupoTrabajoRecord> {
    const existing = await this.prisma.grupoTrabajo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new HttpError(404, "Grupo de trabajo no encontrado");
    }

    return this.prisma.grupoTrabajo.update({
      where: { id },
      data: {
        estado,
        observaciones: observaciones ?? null,
      },
    }) as unknown as Promise<GrupoTrabajoRecord>;
  }
}
