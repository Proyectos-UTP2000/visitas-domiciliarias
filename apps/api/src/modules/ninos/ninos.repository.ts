import type { PrismaClient } from "@prisma/client";
import type {
  NinoCreateInput,
  NinoRecord,
  NinosRepository,
  NinoUpdateInput,
} from "./ninos.types.js";

const ninoInclude = {
  responsable: true,
  sector: {
    include: {
      urbano: true,
      rural: true,
      centroPoblado: true,
    },
  },
  asignaciones: {
    where: { activo: true },
    include: {
      actorSocial: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          dni: true,
        },
      },
    },
  },
};

export class PrismaNinosRepository implements NinosRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(municipalidadId?: string | null, includeArchived?: boolean): Promise<NinoRecord[]> {
    return this.prisma.nino.findMany({
      where: {
        archivado: !!includeArchived,
        deletedAt: null,
        ...(municipalidadId ? { municipalidadId } : {}),
      },
      include: ninoInclude,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }) as unknown as Promise<NinoRecord[]>;
  }

  findById(id: string): Promise<NinoRecord | null> {
    return this.prisma.nino.findFirst({
      where: { id, deletedAt: null },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord | null>;
  }

  findByDni(municipalidadId: string, dni: string): Promise<NinoRecord | null> {
    return this.prisma.nino.findFirst({
      where: { municipalidadId, dni, deletedAt: null },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord | null>;
  }

  findByCnv(municipalidadId: string, cnv: string): Promise<NinoRecord | null> {
    return this.prisma.nino.findFirst({
      where: { municipalidadId, cnv, deletedAt: null },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord | null>;
  }

  create(
    data: NinoCreateInput & { activo: boolean; archivado: boolean }
  ): Promise<NinoRecord> {
    return this.prisma.nino.create({
      data: {
        ...data,
        fechaNac: new Date(data.fechaNac),
        dni: data.dni || null,
        cnv: data.cnv || null,
        sectorId: data.sectorId || null,
        referencia: data.referencia || null,
      },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord>;
  }

  update(id: string, data: NinoUpdateInput): Promise<NinoRecord> {
    return this.prisma.nino.update({
      where: { id },
      data: {
        ...data,
        dni: data.dni || null,
        cnv: data.cnv || null,
        sectorId: data.sectorId || null,
        referencia: data.referencia || null,
      },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord>;
  }

  setActivo(id: string, activo: boolean): Promise<NinoRecord> {
    return this.prisma.nino.update({
      where: { id },
      data: { activo },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord>;
  }

  archive(id: string): Promise<NinoRecord> {
    return this.prisma.nino.update({
      where: { id },
      data: { archivado: true },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord>;
  }

  unarchive(id: string): Promise<NinoRecord> {
    return this.prisma.nino.update({
      where: { id },
      data: { archivado: false },
      include: ninoInclude,
    }) as unknown as Promise<NinoRecord>;
  }

  async getAsignacionActiva(ninoId: string): Promise<any | null> {
    return this.prisma.asignacionNinoSocial.findFirst({
      where: { ninoId, activo: true },
      include: {
        actorSocial: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            dni: true,
          },
        },
        asignadoPor: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async crearAsignacion(
    ninoId: string,
    actorSocialId: string,
    asignadoPorId: string,
    motivo: string
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Desactivar previas
      await tx.asignacionNinoSocial.updateMany({
        where: { ninoId, activo: true },
        data: { activo: false },
      });

      // 2. Crear nueva asignación activa
      return tx.asignacionNinoSocial.create({
        data: {
          ninoId,
          actorSocialId,
          asignadoPorId,
          motivo,
          activo: true,
        },
        include: {
          actorSocial: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              dni: true,
            },
          },
          asignadoPor: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
    });
  }

  async desactivarAsignacionActiva(ninoId: string): Promise<void> {
    await this.prisma.asignacionNinoSocial.updateMany({
      where: { ninoId, activo: true },
      data: { activo: false },
    });
  }

  async listHistorialAsignaciones(ninoId: string): Promise<any[]> {
    return this.prisma.asignacionNinoSocial.findMany({
      where: { ninoId },
      include: {
        actorSocial: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            dni: true,
          },
        },
        asignadoPor: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
