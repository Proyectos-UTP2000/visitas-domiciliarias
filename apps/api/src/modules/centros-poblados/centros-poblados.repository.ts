import type { PrismaClient } from "@prisma/client";
import type {
  CentroPobladoCreateInput,
  CentroPobladoRecord,
  CentroPobladoUpdateInput,
  CentrosPobladosRepository,
} from "./centros-poblados.types.js";

export class PrismaCentrosPobladosRepository implements CentrosPobladosRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(municipalidadId?: string | null): Promise<CentroPobladoRecord[]> {
    return this.prisma.centroPoblado.findMany({
      where: {
        archivado: false,
        ...(municipalidadId ? { municipalidadId } : {}),
      },
      orderBy: [{ nombre: "asc" }],
    }) as unknown as Promise<CentroPobladoRecord[]>;
  }

  async findById(id: string): Promise<CentroPobladoRecord | null> {
    return this.prisma.centroPoblado.findFirst({
      where: { id },
    }) as unknown as Promise<CentroPobladoRecord | null>;
  }

  async findByNameAndType(municipalidadId: string, nombre: string, tipo: string): Promise<CentroPobladoRecord | null> {
    return this.prisma.centroPoblado.findFirst({
      where: { municipalidadId, nombre, tipo, archivado: false },
    }) as unknown as Promise<CentroPobladoRecord | null>;
  }

  async create(data: CentroPobladoCreateInput): Promise<CentroPobladoRecord> {
    return this.prisma.centroPoblado.create({
      data: {
        municipalidadId: data.municipalidadId,
        nombre: data.nombre,
        codigo: data.codigo || null,
        tipo: data.tipo,
        latitud: data.latitud ?? null,
        longitud: data.longitud ?? null,
        poblacion: data.poblacion ?? null,
      },
    }) as unknown as Promise<CentroPobladoRecord>;
  }

  async update(id: string, data: CentroPobladoUpdateInput): Promise<CentroPobladoRecord> {
    return this.prisma.centroPoblado.update({
      where: { id },
      data: {
        nombre: data.nombre,
        codigo: data.codigo || null,
        latitud: data.latitud ?? null,
        longitud: data.longitud ?? null,
        poblacion: data.poblacion ?? null,
      },
    }) as unknown as Promise<CentroPobladoRecord>;
  }

  async setActivo(id: string, activo: boolean): Promise<CentroPobladoRecord> {
    return this.prisma.centroPoblado.update({
      where: { id },
      data: { activo },
    }) as unknown as Promise<CentroPobladoRecord>;
  }

  async archive(id: string): Promise<CentroPobladoRecord> {
    return this.prisma.centroPoblado.update({
      where: { id },
      data: { archivado: true, activo: false },
    }) as unknown as Promise<CentroPobladoRecord>;
  }
}
