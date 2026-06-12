import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../../shared/http-error.js";
import type {
  GrupoEstablecimientoCreateInput,
  GrupoEstablecimientoRecord,
  GrupoTrabajoCreateInput,
  GrupoTrabajoRecord,
  GruposTrabajoRepository,
  MiembroGrupoContactoInput,
  MiembroGrupoCreateInput,
  MiembroGrupoDeleteInput,
  MiembroGrupoRecord,
} from "./grupos-trabajo.types.js";

export class PrismaGruposTrabajoRepository implements GruposTrabajoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(): Promise<GrupoTrabajoRecord[]> {
    return this.prisma.grupoTrabajo.findMany({
      orderBy: [{ periodoYear: "desc" }, { nombreGrupo: "asc" }],
      include: {
        establecimientos: true,
        miembros: true,
      },
    }) as unknown as Promise<GrupoTrabajoRecord[]>;
  }

  findGrupoById(id: string): Promise<{ id: string } | null> {
    return this.prisma.grupoTrabajo.findUnique({
      where: { id },
      select: { id: true },
    });
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
}
