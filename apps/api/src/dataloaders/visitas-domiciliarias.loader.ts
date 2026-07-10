export const DEFAULT_VISITAS = [
  {
    municipalidadCodigo: "VIC",
    ninoDni: "55556666",
    actorSocialDni: "99998888",
    fechaProgramada: new Date("2026-05-10"),
    fechaEjecucion: new Date("2026-05-10T10:00:00.000Z"),
    estado: "EJECUTADA" as const,
    peso: 6.5,
    hierroEntregado: true,
    consejeriaBrindada: true,
    comentarios: "El niño se encuentra con buen peso y talla. Madre receptiva a consejería.",
    alertas: "Ninguna",
  },
  {
    municipalidadCodigo: "VIC",
    ninoDni: "55556666",
    actorSocialDni: "99998888",
    fechaProgramada: new Date("2026-07-20"),
    fechaEjecucion: null,
    estado: "PROGRAMADA" as const,
    peso: null,
    hierroEntregado: null,
    consejeriaBrindada: null,
    comentarios: null,
    alertas: null,
  },
  {
    municipalidadCodigo: "VIC",
    ninoDni: "66667777",
    actorSocialDni: "99998888",
    fechaProgramada: new Date("2026-06-15"),
    fechaEjecucion: new Date("2026-06-15T11:30:00.000Z"),
    estado: "EJECUTADA" as const,
    peso: 8.2,
    hierroEntregado: true,
    consejeriaBrindada: true,
    comentarios: "Vacunas al día. Se recomienda continuar con lactancia materna exclusiva.",
    alertas: null,
  },
  {
    municipalidadCodigo: "VIC",
    ninoDni: "66667777",
    actorSocialDni: "99998888",
    fechaProgramada: new Date("2026-07-15"),
    fechaEjecucion: null,
    estado: "PROGRAMADA" as const,
    peso: null,
    hierroEntregado: null,
    consejeriaBrindada: null,
    comentarios: null,
    alertas: null,
  },
  {
    municipalidadCodigo: "POM",
    ninoDni: "77778888",
    actorSocialDni: "88889999",
    fechaProgramada: new Date("2026-07-18"),
    fechaEjecucion: null,
    estado: "PROGRAMADA" as const,
    peso: null,
    hierroEntregado: null,
    consejeriaBrindada: null,
    comentarios: null,
    alertas: null,
  }
];

type VisitaDelegate = {
  findFirst(args: {
    where: {
      ninoId: string;
      actorSocialId: string;
      fechaProgramada: Date;
    };
  }): Promise<{ id: string } | null>;
  create(args: {
    data: {
      ninoId: string;
      actorSocialId: string;
      fechaProgramada: Date;
      fechaEjecucion?: Date | null;
      estado: "PROGRAMADA" | "EJECUTADA" | "REPROGRAMADA" | "INCONCLUSA";
      peso?: number | null;
      hierroEntregado?: boolean | null;
      consejeriaBrindada?: boolean | null;
      alertas?: string | null;
      comentarios?: string | null;
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

type SeedVisitasDependencies = {
  visitas: VisitaDelegate;
  municipalidades: MunicipalidadFinder;
  ninos: NinoFinder;
  actoresSociales: ActorSocialFinder;
};

export async function seedVisitasDomiciliarias({
  visitas,
  municipalidades,
  ninos,
  actoresSociales,
}: SeedVisitasDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_VISITAS) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(
        `DataLoader Visitas: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando.`
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
        `DataLoader Visitas: Niño con DNI ${item.ninoDni} no encontrado. Saltando.`
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
        `DataLoader Visitas: Actor social con DNI ${item.actorSocialDni} no encontrado. Saltando.`
      );
      continue;
    }

    const existing = await visitas.findFirst({
      where: {
        ninoId: nino.id,
        actorSocialId: actor.id,
        fechaProgramada: item.fechaProgramada,
      },
    });

    if (existing) {
      continue;
    }

    await visitas.create({
      data: {
        ninoId: nino.id,
        actorSocialId: actor.id,
        fechaProgramada: item.fechaProgramada,
        fechaEjecucion: item.fechaEjecucion,
        estado: item.estado,
        peso: item.peso,
        hierroEntregado: item.hierroEntregado,
        consejeriaBrindada: item.consejeriaBrindada,
        alertas: item.alertas,
        comentarios: item.comentarios,
      },
    });

    createdCount++;
  }

  return createdCount;
}
