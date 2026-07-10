import type { PrismaClient } from "@prisma/client";

export interface ReportesFiltros {
  municipalidadId?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  actorSocialId?: string | null;
  sectorId?: string | null;
}

export class ReportesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getVisitasActividad(filtros: ReportesFiltros) {
    const whereClause: any = {};

    if (filtros.municipalidadId) {
      whereClause.nino = {
        municipalidadId: filtros.municipalidadId,
      };
    }

    if (filtros.actorSocialId) {
      whereClause.actorSocialId = filtros.actorSocialId;
    }

    if (filtros.sectorId) {
      if (whereClause.nino) {
        whereClause.nino.sectorId = filtros.sectorId;
      } else {
        whereClause.nino = {
          sectorId: filtros.sectorId,
        };
      }
    }

    if (filtros.fechaInicio || filtros.fechaFin) {
      whereClause.fechaProgramada = {};
      if (filtros.fechaInicio) {
        whereClause.fechaProgramada.gte = new Date(filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        whereClause.fechaProgramada.lte = new Date(filtros.fechaFin);
      }
    }

    return this.prisma.visitaDomiciliaria.findMany({
      where: whereClause,
      include: {
        nino: {
          include: {
            sector: true,
            responsable: true,
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
      },
      orderBy: {
        fechaProgramada: "asc",
      },
    });
  }

  async getActoresSociales(municipalidadId?: string | null) {
    return this.prisma.actorSocial.findMany({
      where: {
        ...(municipalidadId ? { municipalidadId } : {}),
        activo: true,
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        dni: true,
      },
    });
  }

  async getNinosOperativo(filtros: { municipalidadId?: string | null; sectorId?: string | null }) {
    const whereClause: any = {
      activo: true,
    };

    if (filtros.municipalidadId) {
      whereClause.municipalidadId = filtros.municipalidadId;
    }

    if (filtros.sectorId) {
      whereClause.sectorId = filtros.sectorId;
    }

    return this.prisma.nino.findMany({
      where: whereClause,
      include: {
        responsable: true,
        sector: true,
        visitas: {
          where: {
            estado: "EJECUTADA",
          },
          select: {
            id: true,
            consejeriaBrindada: true,
            fechaEjecucion: true,
          },
        },
      },
      orderBy: {
        apellidos: "asc",
      },
    });
  }

  async getSectores(municipalidadId?: string | null) {
    return this.prisma.sector.findMany({
      where: {
        ...(municipalidadId ? { municipalidadId } : {}),
        activo: true,
      },
      select: {
        id: true,
        nombreSector: true,
        tipoSector: true,
        codigo: true,
      },
    });
  }
}
