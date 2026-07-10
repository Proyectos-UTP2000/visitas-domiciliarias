import type { PrismaClient } from "@prisma/client";
import type {
  ResponsableCreateInput,
  ResponsableRecord,
  ResponsablesRepository,
  ResponsableUpdateInput,
} from "./responsables.types.js";

export class PrismaResponsablesRepository implements ResponsablesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(municipalidadId?: string | null): Promise<ResponsableRecord[]> {
    return this.prisma.responsable.findMany({
      where: {
        archivado: false,
        ...(municipalidadId ? { municipalidadId } : {}),
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }) as unknown as Promise<ResponsableRecord[]>;
  }

  findById(id: string): Promise<ResponsableRecord | null> {
    return this.prisma.responsable.findUnique({
      where: { id },
    }) as unknown as Promise<ResponsableRecord | null>;
  }

  findByDni(
    municipalidadId: string,
    tipoDocumento: string,
    dni: string
  ): Promise<ResponsableRecord | null> {
    return this.prisma.responsable.findUnique({
      where: {
        municipalidadId_tipoDocumento_dni: {
          municipalidadId,
          tipoDocumento,
          dni,
        },
      },
    }) as unknown as Promise<ResponsableRecord | null>;
  }

  create(
    data: ResponsableCreateInput & { activo: boolean; archivado: boolean }
  ): Promise<ResponsableRecord> {
    return this.prisma.responsable.create({
      data,
    }) as unknown as Promise<ResponsableRecord>;
  }

  update(id: string, data: ResponsableUpdateInput): Promise<ResponsableRecord> {
    return this.prisma.responsable.update({
      where: { id },
      data,
    }) as unknown as Promise<ResponsableRecord>;
  }

  setActivo(id: string, activo: boolean): Promise<ResponsableRecord> {
    return this.prisma.responsable.update({
      where: { id },
      data: { activo },
    }) as unknown as Promise<ResponsableRecord>;
  }

  archive(id: string): Promise<ResponsableRecord> {
    return this.prisma.responsable.update({
      where: { id },
      data: { archivado: true },
    }) as unknown as Promise<ResponsableRecord>;
  }
}
