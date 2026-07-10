import type { PrismaClient } from "@prisma/client";
import type {
  EstadoVisita,
  VisitaDomiciliariaRecord,
  VisitasRepository,
} from "./visitas.types.js";

const visitaInclude = {
  nino: {
    include: {
      responsable: true,
      sector: true,
    },
  },
  actorSocial: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      dni: true,
      celular: true,
    },
  },
};

export class PrismaVisitasRepository implements VisitasRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(filters: {
    municipalidadId?: string | null;
    actorSocialId?: string | null;
    ninoId?: string | null;
    estado?: EstadoVisita | null;
  }): Promise<VisitaDomiciliariaRecord[]> {
    return this.prisma.visitaDomiciliaria.findMany({
      where: {
        ...(filters.ninoId ? { ninoId: filters.ninoId } : {}),
        ...(filters.actorSocialId ? { actorSocialId: filters.actorSocialId } : {}),
        ...(filters.estado ? { estado: filters.estado } : {}),
        ...(filters.municipalidadId
          ? {
              nino: {
                municipalidadId: filters.municipalidadId,
              },
            }
          : {}),
      },
      include: visitaInclude,
      orderBy: { fechaProgramada: "asc" },
    }) as unknown as Promise<VisitaDomiciliariaRecord[]>;
  }

  findById(id: string): Promise<VisitaDomiciliariaRecord | null> {
    return this.prisma.visitaDomiciliaria.findUnique({
      where: { id },
      include: visitaInclude,
    }) as unknown as Promise<VisitaDomiciliariaRecord | null>;
  }

  create(data: {
    ninoId: string;
    actorSocialId: string;
    fechaProgramada: Date;
    estado: EstadoVisita;
  }): Promise<VisitaDomiciliariaRecord> {
    return this.prisma.visitaDomiciliaria.create({
      data,
      include: visitaInclude,
    }) as unknown as Promise<VisitaDomiciliariaRecord>;
  }

  async createBulk(data: {
    ninoId: string;
    actorSocialId: string;
    fechaProgramada: Date;
    estado: EstadoVisita;
  }[]): Promise<VisitaDomiciliariaRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      const results: VisitaDomiciliariaRecord[] = [];
      for (const item of data) {
        const res = await tx.visitaDomiciliaria.create({
          data: item,
          include: visitaInclude,
        });
        results.push(res as unknown as VisitaDomiciliariaRecord);
      }
      return results;
    });
  }

  updateEstado(
    id: string,
    estado: EstadoVisita,
    extra?: Partial<Omit<VisitaDomiciliariaRecord, "id" | "estado" | "createdAt" | "updatedAt">>
  ): Promise<VisitaDomiciliariaRecord> {
    return this.prisma.visitaDomiciliaria.update({
      where: { id },
      data: {
        estado,
        ...extra,
        ...(extra?.fechaEjecucion ? { fechaEjecucion: new Date(extra.fechaEjecucion) } : {}),
      },
      include: visitaInclude,
    }) as unknown as Promise<VisitaDomiciliariaRecord>;
  }

  async findNinoById(id: string): Promise<any | null> {
    return this.prisma.nino.findUnique({
      where: { id },
      select: { id: true, municipalidadId: true, activo: true, fechaNac: true, apellidos: true, nombres: true },
    });
  }

  async findActorById(id: string): Promise<any | null> {
    return this.prisma.actorSocial.findUnique({
      where: { id },
      select: { id: true, municipalidadId: true, activo: true },
    });
  }

  async reprogramarVisita(
    visitaId: string,
    motivo: string,
    nuevaFechaProgramada: Date
  ): Promise<{ vieja: VisitaDomiciliariaRecord; nueva: VisitaDomiciliariaRecord }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener la visita original
      const original = await tx.visitaDomiciliaria.findUnique({
        where: { id: visitaId },
      });
      if (!original) {
        throw new Error("Visita original no encontrada");
      }

      // 2. Actualizar visita actual a REPROGRAMADA
      const vieja = await tx.visitaDomiciliaria.update({
        where: { id: visitaId },
        data: {
          estado: "REPROGRAMADA",
          motivoInconclusa: motivo,
        },
        include: visitaInclude,
      });

      // 3. Crear la nueva visita programada
      const nueva = await tx.visitaDomiciliaria.create({
        data: {
          ninoId: original.ninoId,
          actorSocialId: original.actorSocialId,
          fechaProgramada: nuevaFechaProgramada,
          estado: "PROGRAMADA",
        },
        include: visitaInclude,
      });

      return {
        vieja: vieja as unknown as VisitaDomiciliariaRecord,
        nueva: nueva as unknown as VisitaDomiciliariaRecord,
      };
    });
  }
}
