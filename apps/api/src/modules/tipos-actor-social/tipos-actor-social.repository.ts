import type { PrismaClient } from "@prisma/client";
import type {
  TipoActorSocialCreateInput,
  TipoActorSocialRecord,
  TipoActorSocialUpdateInput,
  TiposActorSocialRepository,
} from "./tipos-actor-social.types.js";
function map(record: any): TipoActorSocialRecord {
  return {
    ...record,
    tarifaRural: Number(record.tarifaRural),
    tarifaUrbana: Number(record.tarifaUrbana),
  };
}
export class PrismaTiposActorSocialRepository implements TiposActorSocialRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async list(): Promise<TipoActorSocialRecord[]> {
    return (
      await this.prisma.tipoActorSocial.findMany({
        where: { archivado: false },
        orderBy: [{ orden: "asc" }, { tipoActor: "asc" }],
      })
    ).map(map);
  }
  findById(id: string) {
    return this.prisma.tipoActorSocial.findUnique({ where: { id } });
  }
  findByCodigo(codigo: string) {
    return this.prisma.tipoActorSocial.findUnique({ where: { codigo } });
  }
  async create(
    data: TipoActorSocialCreateInput & { activo: true; archivado: false },
  ): Promise<TipoActorSocialRecord> {
    return map(await this.prisma.tipoActorSocial.create({ data }));
  }
  async update(
    id: string,
    data: TipoActorSocialUpdateInput,
  ): Promise<TipoActorSocialRecord> {
    return map(
      await this.prisma.tipoActorSocial.update({ where: { id }, data }),
    );
  }
  async setActivo(id: string, activo: boolean): Promise<TipoActorSocialRecord> {
    return map(
      await this.prisma.tipoActorSocial.update({
        where: { id },
        data: { activo },
      }),
    );
  }
  async archive(id: string): Promise<TipoActorSocialRecord> {
    return map(
      await this.prisma.tipoActorSocial.update({
        where: { id },
        data: { archivado: true },
      }),
    );
  }
}
