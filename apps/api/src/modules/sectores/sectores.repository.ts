import type { PrismaClient } from "@prisma/client";
import type {
  SectorCreateData,
  SectorPayload,
  SectorRecord,
  SectoresRepository,
} from "./sectores.types.js";

const sectorInclude = {
  urbano: true,
  rural: true,
  centroPoblado: true,
};

export class PrismaSectoresRepository implements SectoresRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(municipalidadId?: string | null): Promise<SectorRecord[]> {
    return this.prisma.sector.findMany({
      where: {
        archivado: false,
        ...(municipalidadId ? { municipalidadId } : {}),
      },
      include: sectorInclude,
      orderBy: [{ distrito: "asc" }, { nombreSector: "asc" }],
    });
  }

  findById(id: string): Promise<{ id: string; municipalidadId: string } | null> {
    return this.prisma.sector.findUnique({
      where: { id },
      select: { id: true, municipalidadId: true },
    });
  }

  findByMunicipalidadAndCodigo(
    municipalidadId: string,
    codigo: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.sector.findUnique({
      where: { municipalidadId_codigo: { municipalidadId, codigo } },
      select: { id: true },
    });
  }

  create(data: SectorCreateData): Promise<SectorRecord> {
    return this.prisma.sector.create({
      data: {
        municipalidadId: data.municipalidadId,
        codigo: data.codigo,
        departamento: data.departamento,
        provincia: data.provincia,
        distrito: data.distrito,
        centroPobladoId: data.centroPobladoId,
        nombreSector: data.nombreSector,
        tipoSector: data.tipoSector,
        activo: data.activo,
        archivado: data.archivado,
        urbano: data.urbano ? { create: data.urbano } : undefined,
        rural: data.rural ? { create: data.rural } : undefined,
      },
      include: sectorInclude,
    });
  }

  update(id: string, data: SectorPayload): Promise<SectorRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.sectorUrbano.deleteMany({ where: { sectorId: id } });
      await tx.sectorRural.deleteMany({ where: { sectorId: id } });

      return tx.sector.update({
        where: { id },
        data: {
          municipalidadId: data.municipalidadId,
          codigo: data.codigo,
          departamento: data.departamento,
          provincia: data.provincia,
          distrito: data.distrito,
          centroPobladoId: data.centroPobladoId,
          nombreSector: data.nombreSector,
          tipoSector: data.tipoSector,
          urbano: data.urbano ? { create: data.urbano } : undefined,
          rural: data.rural ? { create: data.rural } : undefined,
        },
        include: sectorInclude,
      });
    });
  }

  setActivo(id: string, activo: boolean): Promise<SectorRecord> {
    return this.prisma.sector.update({
      where: { id },
      data: { activo },
      include: sectorInclude,
    });
  }

  archive(id: string): Promise<SectorRecord> {
    return this.prisma.sector.update({
      where: { id },
      data: { archivado: true },
      include: sectorInclude,
    });
  }
}
