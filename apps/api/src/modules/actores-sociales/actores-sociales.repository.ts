import type { PrismaClient } from "@prisma/client";
import type {
  ActorSocialCreateInput,
  ActorSocialRecord,
  ActorSocialUpdateInput,
  ActoresSocialesRepository,
  EstadoActorSocial,
} from "./actores-sociales.types.js";

export class PrismaActoresSocialesRepository implements ActoresSocialesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(municipalidadId?: string | null): Promise<ActorSocialRecord[]> {
    return this.prisma.actorSocial.findMany({
      where: {
        archivado: false,
        deletedAt: null,
        ...(municipalidadId ? { municipalidadId } : {}),
      },
      include: {
        sectores: true,
        sectoresACorregir: true,
        centroPoblado: true,
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }) as unknown as Promise<ActorSocialRecord[]>;
  }

  async findById(id: string): Promise<ActorSocialRecord | null> {
    return this.prisma.actorSocial.findFirst({
      where: { id, deletedAt: null },
      include: {
        sectores: true,
        sectoresACorregir: true,
        centroPoblado: true,
      },
    }) as unknown as Promise<ActorSocialRecord | null>;
  }

  async findByDni(municipalidadId: string, dni: string): Promise<ActorSocialRecord | null> {
    return this.prisma.actorSocial.findFirst({
      where: { municipalidadId, dni, deletedAt: null },
      include: {
        centroPoblado: true,
      },
    }) as unknown as Promise<ActorSocialRecord | null>;
  }

  async findByUsername(username: string): Promise<boolean> {
    const user = await this.prisma.usuario.findUnique({
      where: { username },
      select: { id: true },
    });
    return user !== null;
  }

  async create(
    data: Omit<ActorSocialCreateInput, "password"> & {
      passwordHash: string;
      estado: "BORRADOR";
      activo: boolean;
      archivado: boolean;
    }
  ): Promise<ActorSocialRecord> {
    const { username, passwordHash, sectoresIds, sectoresACorregirIds, ...actorData } = data;

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          username,
          passwordHash,
          rol: "ACTOR_SOCIAL",
          activo: actorData.activo,
          municipalidadId: actorData.municipalidadId,
        },
      });

      const actor = await tx.actorSocial.create({
        data: {
          ...actorData,
          fechaNac: new Date(actorData.fechaNac),
          usuarioId: usuario.id,
          sectores: sectoresIds ? { connect: sectoresIds.map((id) => ({ id })) } : undefined,
          sectoresACorregir: sectoresACorregirIds
            ? { connect: sectoresACorregirIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          sectores: true,
          sectoresACorregir: true,
          centroPoblado: true,
        },
      });

      return actor;
    }) as unknown as Promise<ActorSocialRecord>;
  }

  async update(id: string, data: ActorSocialUpdateInput): Promise<ActorSocialRecord> {
    const { sectoresIds, sectoresACorregirIds, ...actorData } = data;
    return this.prisma.actorSocial.update({
      where: { id },
      data: {
        ...actorData,
        entidadId: actorData.entidadId ?? null,
        centroPobladoId: actorData.centroPobladoId ?? null,
        grupoEstablecimientoId: actorData.grupoEstablecimientoId ?? null,
        sectores: sectoresIds ? { set: sectoresIds.map((sid) => ({ id: sid })) } : undefined,
        sectoresACorregir: sectoresACorregirIds
          ? { set: sectoresACorregirIds.map((sid) => ({ id: sid })) }
          : undefined,
      },
      include: {
        sectores: true,
        sectoresACorregir: true,
        centroPoblado: true,
      },
    }) as unknown as Promise<ActorSocialRecord>;
  }

  async setActivo(id: string, activo: boolean): Promise<ActorSocialRecord> {
    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.actorSocial.update({
        where: { id },
        data: { activo },
      });

      if (actor.usuarioId) {
        await tx.usuario.update({
          where: { id: actor.usuarioId },
          data: { activo },
        });
      }

      return actor;
    }) as unknown as Promise<ActorSocialRecord>;
  }

  async setEstado(id: string, estado: EstadoActorSocial): Promise<ActorSocialRecord> {
    return this.prisma.actorSocial.update({
      where: { id },
      data: { estado },
    }) as unknown as Promise<ActorSocialRecord>;
  }

  async archive(id: string): Promise<ActorSocialRecord> {
    return this.prisma.actorSocial.update({
      where: { id },
      data: { archivado: true },
    }) as unknown as Promise<ActorSocialRecord>;
  }

  async delete(id: string, motivoEliminacion: string): Promise<ActorSocialRecord> {
    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.actorSocial.update({
        where: { id },
        data: {
          archivado: true,
          deletedAt: new Date(),
          motivoEliminacion,
          activo: false,
        },
      });

      if (actor.usuarioId) {
        await tx.usuario.update({
          where: { id: actor.usuarioId },
          data: { activo: false },
        });
      }

      return actor;
    }) as unknown as Promise<ActorSocialRecord>;
  }

  async findActiveBySector(sectorId: string, excludingActorId?: string): Promise<ActorSocialRecord | null> {
    return this.prisma.actorSocial.findFirst({
      where: {
        archivado: false,
        deletedAt: null,
        activo: true,
        ...(excludingActorId ? { id: { not: excludingActorId } } : {}),
        sectores: {
          some: { id: sectorId },
        },
      },
      include: {
        sectores: true,
      },
    }) as unknown as Promise<ActorSocialRecord | null>;
  }
}
