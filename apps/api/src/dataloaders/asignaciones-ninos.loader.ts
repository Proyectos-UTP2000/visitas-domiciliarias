export const DEFAULT_ASIGNACIONES = [
  {
    municipalidadCodigo: "VIC",
    ninoDni: "55556666",
    actorSocialDni: "99998888",
    asignadoPorUsername: "admin_vic",
    motivo: "Asignación inicial de sector urbano para seguimiento",
  },
  {
    municipalidadCodigo: "VIC",
    ninoDni: "66667777",
    actorSocialDni: "99998888",
    asignadoPorUsername: "admin_vic",
    motivo: "Asignación inicial de sector urbano para seguimiento",
  },
  {
    municipalidadCodigo: "POM",
    ninoDni: "77778888",
    actorSocialDni: "88889999",
    asignadoPorUsername: "admin_pom",
    motivo: "Asignación inicial para sector rural",
  }
];

type AsignacionDelegate = {
  findFirst(args: {
    where: {
      ninoId: string;
      actorSocialId: string;
      activo: boolean;
    };
  }): Promise<{ id: string } | null>;
  create(args: {
    data: {
      ninoId: string;
      actorSocialId: string;
      asignadoPorId: string;
      motivo?: string | null;
      activo: boolean;
    };
  }): Promise<unknown>;
};

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type NinoFinder = {
  findFirst(args: {
    where: { municipalidadId: string; dni: string };
  }): Promise<{ id: string } | null>;
};

type ActorSocialFinder = {
  findFirst(args: {
    where: { municipalidadId: string; dni: string };
  }): Promise<{ id: string } | null>;
};

type UsuarioFinder = {
  findUnique(args: {
    where: { username: string };
  }): Promise<{ id: string } | null>;
};

type SeedAsignacionesDependencies = {
  asignaciones: AsignacionDelegate;
  municipalidades: MunicipalidadFinder;
  ninos: NinoFinder;
  actoresSociales: ActorSocialFinder;
  usuarios: UsuarioFinder;
};

export async function seedAsignacionesNinos({
  asignaciones,
  municipalidades,
  ninos,
  actoresSociales,
  usuarios,
}: SeedAsignacionesDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_ASIGNACIONES) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(
        `DataLoader Asignaciones: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando.`
      );
      continue;
    }

    const nino = await ninos.findFirst({
      where: {
        municipalidadId: muni.id,
        dni: item.ninoDni,
      },
    });

    if (!nino) {
      console.warn(
        `DataLoader Asignaciones: Niño con DNI ${item.ninoDni} no encontrado. Saltando.`
      );
      continue;
    }

    const actor = await actoresSociales.findFirst({
      where: {
        municipalidadId: muni.id,
        dni: item.actorSocialDni,
      },
    });

    if (!actor) {
      console.warn(
        `DataLoader Asignaciones: Actor social con DNI ${item.actorSocialDni} no encontrado. Saltando.`
      );
      continue;
    }

    const user = await usuarios.findUnique({
      where: { username: item.asignadoPorUsername },
    });

    if (!user) {
      console.warn(
        `DataLoader Asignaciones: Usuario asignador ${item.asignadoPorUsername} no encontrado. Saltando.`
      );
      continue;
    }

    const existing = await asignaciones.findFirst({
      where: {
        ninoId: nino.id,
        actorSocialId: actor.id,
        activo: true,
      },
    });

    if (existing) {
      continue;
    }

    await asignaciones.create({
      data: {
        ninoId: nino.id,
        actorSocialId: actor.id,
        asignadoPorId: user.id,
        motivo: item.motivo,
        activo: true,
      },
    });

    createdCount++;
  }

  return createdCount;
}
