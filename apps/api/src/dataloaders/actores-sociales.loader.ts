export const DEFAULT_ACTORES_SOCIALES = [
  {
    municipalidadCodigo: "POM",
    tipoActorCodigo: "1", // Agentes Comunitarios
    grupoTrabajoNombre: "Grupo de Trabajo Pomahuaca 2026",
    grupoEstablecimientoCodigo: "E-POM-01",
    centroPobladoCodigo: "CP-POM-URB-01",
    sectorCodigo: "SEC-URB-POM-01",
    dni: "88889999",
    nombres: "Ana",
    apellidos: "Torres Ruiz",
    direccion: "Calle Las Flores 456",
    fechaNac: new Date("1995-04-12"),
    email: "ana.torres@gmail.com",
    celular: "955444333",
    idiomaOrigen: "Español",
    gradoInstruccion: "Secundaria Completa",
    username: "actor_pom",
    password: "password123",
  },
  {
    municipalidadCodigo: "LIM",
    tipoActorCodigo: "3", // Agentes Voluntarios
    grupoTrabajoNombre: "Grupo de Trabajo Lima Metropoli 2026",
    grupoEstablecimientoCodigo: "E-SJM-01",
    centroPobladoCodigo: "CP-LIM-URB-01",
    sectorCodigo: "SEC-URB-LIM-01",
    dni: "12348765",
    nombres: "Roberto",
    apellidos: "Gomez Prado",
    direccion: "Av. Arequipa 1020",
    fechaNac: new Date("1992-08-25"),
    email: "roberto.gomez@gmail.com",
    celular: "966555444",
    idiomaOrigen: "Español",
    gradoInstruccion: "Técnico Superior",
    username: "actor_lim",
    password: "password123",
  },
  {
    municipalidadCodigo: "VIC",
    tipoActorCodigo: "1", // Agentes Comunitarios
    grupoTrabajoNombre: "Grupo de Trabajo La Victoria 2026",
    grupoEstablecimientoCodigo: "E-VIC-01",
    centroPobladoCodigo: "CP-VIC-URB-01",
    sectorCodigo: "SEC-URB-VIC-01",
    dni: "99998888",
    nombres: "Lucia Maria",
    apellidos: "Santisteban Diaz",
    direccion: "Av. Larco 789",
    fechaNac: new Date("1994-11-05"),
    email: "lucia.santisteban@gmail.com",
    celular: "955666888",
    idiomaOrigen: "Español",
    gradoInstruccion: "Superior Completa",
    username: "actor_vic",
    password: "password123",
  }
];

type UserDelegate = {
  findUnique(args: { where: { username: string } }): Promise<{ id: string } | null>;
  create(args: {
    data: {
      username: string;
      passwordHash: string;
      rol: "ACTOR_SOCIAL";
      activo: boolean;
      municipalidadId: string;
    };
  }): Promise<{ id: string }>;
};

type ActorSocialDelegate = {
  findUnique(args: {
    where: { municipalidadId_dni: { municipalidadId: string; dni: string } };
  }): Promise<unknown | null>;
  create(args: {
    data: {
      usuarioId?: string | null;
      municipalidadId: string;
      tipoActorSocialId: string;
      grupoTrabajoId: string;
      grupoEstablecimientoId?: string | null;
      centroPobladoId?: string | null;
      dni: string;
      nombres: string;
      apellidos: string;
      direccion: string;
      fechaNac: Date;
      email: string;
      celular: string;
      idiomaOrigen: string;
      gradoInstruccion: string;
      estado: "BORRADOR" | "REGISTRADO" | "VALIDADO" | "APROBADO";
      activo: boolean;
      archivado: boolean;
      sectores?: {
        connect: Array<{ id: string }>;
      };
    };
  }): Promise<unknown>;
};

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type TipoActorSocialFinder = {
  findUnique(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type GrupoTrabajoFinder = {
  findFirst(args: {
    where: { municipalidadId: string; nombreGrupo: string };
  }): Promise<{ id: string } | null>;
};

type GrupoEstablecimientoFinder = {
  findFirst(args: {
    where: { grupoTrabajoId: string; codigo: string };
  }): Promise<{ id: string } | null>;
};

type CentroPobladoFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type SectorFinder = {
  findUnique(args: {
    where: { municipalidadId_codigo: { municipalidadId: string; codigo: string } };
  }): Promise<{ id: string } | null>;
};

type SeedActoresSocialesDependencies = {
  users: UserDelegate;
  actoresSociales: ActorSocialDelegate;
  municipalidades: MunicipalidadFinder;
  tiposActorSocial: TipoActorSocialFinder;
  gruposTrabajo: GrupoTrabajoFinder;
  grupoEstablecimientos: GrupoEstablecimientoFinder;
  centrosPoblados: CentroPobladoFinder;
  sectores: SectorFinder;
  hashPassword(password: string): Promise<string>;
};

export async function seedActoresSociales({
  users,
  actoresSociales,
  municipalidades,
  tiposActorSocial,
  gruposTrabajo,
  grupoEstablecimientos,
  centrosPoblados,
  sectores,
  hashPassword,
}: SeedActoresSocialesDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_ACTORES_SOCIALES) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(`DataLoader ActoresSociales: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando.`);
      continue;
    }

    const existing = await actoresSociales.findUnique({
      where: {
        municipalidadId_dni: {
          municipalidadId: muni.id,
          dni: item.dni,
        },
      },
    });

    if (existing) {
      continue;
    }

    // Resolve dependencies
    const tipoActor = await tiposActorSocial.findUnique({
      where: { codigo: item.tipoActorCodigo },
    });
    if (!tipoActor) {
      console.warn(`DataLoader ActoresSociales: TipoActor con código ${item.tipoActorCodigo} no encontrado. Saltando actor.`);
      continue;
    }

    const grupo = await gruposTrabajo.findFirst({
      where: { municipalidadId: muni.id, nombreGrupo: item.grupoTrabajoNombre },
    });
    if (!grupo) {
      console.warn(`DataLoader ActoresSociales: Grupo de trabajo ${item.grupoTrabajoNombre} no encontrado. Saltando actor.`);
      continue;
    }

    const cp = await centrosPoblados.findFirst({
      where: { codigo: item.centroPobladoCodigo },
    });
    if (!cp) {
      console.warn(`DataLoader ActoresSociales: Centro poblado ${item.centroPobladoCodigo} no encontrado. Saltando actor.`);
      continue;
    }

    const sec = await sectores.findUnique({
      where: {
        municipalidadId_codigo: {
          municipalidadId: muni.id,
          codigo: item.sectorCodigo,
        },
      },
    });
    if (!sec) {
      console.warn(`DataLoader ActoresSociales: Sector ${item.sectorCodigo} no encontrado. Saltando actor.`);
      continue;
    }

    let estId: string | null = null;
    if (item.grupoEstablecimientoCodigo) {
      const est = await grupoEstablecimientos.findFirst({
        where: { grupoTrabajoId: grupo.id, codigo: item.grupoEstablecimientoCodigo },
      });
      if (est) {
        estId = est.id;
      }
    }

    // 1. Create or Find User
    let userId: string | null = null;
    let user = await users.findUnique({ where: { username: item.username } });
    if (!user) {
      const passwordHash = await hashPassword(item.password);
      user = await users.create({
        data: {
          username: item.username,
          passwordHash,
          rol: "ACTOR_SOCIAL",
          activo: true,
          municipalidadId: muni.id,
        },
      });
    }
    userId = user.id;

    // 2. Create ActorSocial
    await actoresSociales.create({
      data: {
        usuarioId: userId,
        municipalidadId: muni.id,
        tipoActorSocialId: tipoActor.id,
        grupoTrabajoId: grupo.id,
        grupoEstablecimientoId: estId,
        centroPobladoId: cp.id,
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        direccion: item.direccion,
        fechaNac: item.fechaNac,
        email: item.email,
        celular: item.celular,
        idiomaOrigen: item.idiomaOrigen,
        gradoInstruccion: item.gradoInstruccion,
        estado: "APROBADO", // Seeding as approved so it is operational
        activo: true,
        archivado: false,
        sectores: {
          connect: [{ id: sec.id }],
        },
      },
    });

    createdCount++;
  }

  return createdCount;
}
