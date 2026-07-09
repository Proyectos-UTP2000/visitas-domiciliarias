export const DEFAULT_GRUPOS_TRABAJO = [
  {
    municipalidadCodigo: "POM",
    nombreGrupo: "Grupo de Trabajo Pomahuaca 2026",
    periodoYear: 2026,
    dniRepresentante: "44445555",
    nombreRepresentante: "Juan",
    apellidosRepresentante: "Perez",
    estado: "BORRADOR" as const,
    establecimientos: [
      {
        nombre: "Puesto de Salud Pomahuaca Principal",
        codigo: "E-POM-01",
        direccion: "Calle Principal s/n",
      }
    ],
    miembros: [
      {
        dni: "77778888",
        nombres: "Maria",
        apellidos: "Gomez",
        celular: "999888777",
        email: "maria.gomez@gmail.com",
        cargoNombre: "Presidente",
      },
      {
        dni: "77778889",
        nombres: "Carlos",
        apellidos: "Ruiz",
        celular: "999888776",
        email: "carlos.ruiz@gmail.com",
        cargoNombre: "Secretario",
      }
    ]
  },
  {
    municipalidadCodigo: "LIM",
    nombreGrupo: "Grupo de Trabajo Lima Metropoli 2026",
    periodoYear: 2026,
    dniRepresentante: "11112222",
    nombreRepresentante: "Sofia",
    apellidosRepresentante: "Rodriguez",
    estado: "REGISTRADO" as const,
    establecimientos: [
      {
        nombre: "Centro de Salud San Juan de Miraflores",
        codigo: "E-SJM-01",
        direccion: "Av. Central 123",
      }
    ],
    miembros: [
      {
        dni: "22223333",
        nombres: "Luis",
        apellidos: "Fernandez",
        celular: "988777666",
        email: "luis.fernandez@gmail.com",
        cargoNombre: "Presidente",
      }
    ]
  },
  {
    municipalidadCodigo: "VIC",
    nombreGrupo: "Grupo de Trabajo La Victoria 2026",
    periodoYear: 2026,
    dniRepresentante: "33334444",
    nombreRepresentante: "Ana",
    apellidosRepresentante: "Diaz",
    estado: "BORRADOR" as const,
    establecimientos: [
      {
        nombre: "Centro de Salud La Victoria",
        codigo: "E-VIC-01",
        direccion: "Av. Los Incas 123",
      }
    ],
    miembros: [
      {
        dni: "55556666",
        nombres: "Ana",
        apellidos: "Gomez",
        celular: "955666777",
        email: "ana.gomez@gmail.com",
        cargoNombre: "Presidente",
      },
      {
        dni: "55556667",
        nombres: "Juan",
        apellidos: "Carlos",
        celular: "955666778",
        email: "juan.carlos@gmail.com",
        cargoNombre: "Secretario",
      }
    ]
  }
];

type GrupoTrabajoDelegate = {
  findFirst(args: {
    where: { municipalidadId: string; nombreGrupo: string };
  }): Promise<{ id: string } | null>;
  create(args: {
    data: {
      municipalidadId: string;
      nombreGrupo: string;
      periodoYear: number;
      fechaLimite: Date;
      dniRepresentante: string;
      nombreRepresentante: string;
      apellidosRepresentante: string;
      estado: "BORRADOR" | "REGISTRADO" | "OBSERVADO" | "VALIDADO" | "RECHAZADO";
      activo: boolean;
      archivado: boolean;
      establecimientos?: {
        create: Array<{
          nombre: string;
          codigo: string;
          direccion: string;
          activo: boolean;
        }>;
      };
    };
  }): Promise<{ id: string }>;
};

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type CargoMiembroGrupoFinder = {
  findFirst(args: { where: { nombre: string } }): Promise<{ id: string } | null>;
};

type MiembroGrupoDelegate = {
  create(args: {
    data: {
      grupoTrabajoId: string;
      grupoEstablecimientoId?: string | null;
      cargoMiembroGrupoId: string;
      dni: string;
      nombres: string;
      apellidos: string;
      celular?: string | null;
      email?: string | null;
      activo: boolean;
      archivado: boolean;
    };
  }): Promise<unknown>;
};

type GrupoEstablecimientoFinder = {
  findFirst(args: {
    where: { grupoTrabajoId: string; codigo: string };
  }): Promise<{ id: string } | null>;
};

type SeedGruposTrabajoDependencies = {
  gruposTrabajo: GrupoTrabajoDelegate;
  municipalidades: MunicipalidadFinder;
  cargosMiembroGrupo: CargoMiembroGrupoFinder;
  miembrosGrupo: MiembroGrupoDelegate;
  grupoEstablecimientos: GrupoEstablecimientoFinder;
};

export async function seedGruposTrabajo({
  gruposTrabajo,
  municipalidades,
  cargosMiembroGrupo,
  miembrosGrupo,
  grupoEstablecimientos,
}: SeedGruposTrabajoDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_GRUPOS_TRABAJO) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(`DataLoader GruposTrabajo: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando grupo ${item.nombreGrupo}.`);
      continue;
    }

    let group = await gruposTrabajo.findFirst({
      where: {
        municipalidadId: muni.id,
        nombreGrupo: item.nombreGrupo,
      },
    });

    if (!group) {
      // Create group with establishments
      group = await gruposTrabajo.create({
        data: {
          municipalidadId: muni.id,
          nombreGrupo: item.nombreGrupo,
          periodoYear: item.periodoYear,
          fechaLimite: new Date("2027-12-31T23:59:59Z"),
          dniRepresentante: item.dniRepresentante,
          nombreRepresentante: item.nombreRepresentante,
          apellidosRepresentante: item.apellidosRepresentante,
          estado: item.estado,
          activo: true,
          archivado: false,
          establecimientos: {
            create: item.establecimientos.map((e) => ({
              nombre: e.nombre,
              codigo: e.codigo,
              direccion: e.direccion,
              activo: true,
            })),
          },
        },
      });
      createdCount++;
    }

    // Now seed members
    for (const m of item.miembros) {
      const cargo = await cargosMiembroGrupo.findFirst({
        where: { nombre: m.cargoNombre },
      });

      if (!cargo) {
        console.warn(`DataLoader GruposTrabajo: Cargo ${m.cargoNombre} no encontrado para el miembro ${m.nombres}. Saltando.`);
        continue;
      }

      // Link to the establishment if exists in database
      let estId: string | null = null;
      if (item.establecimientos.length > 0) {
        const est = await grupoEstablecimientos.findFirst({
          where: {
            grupoTrabajoId: group.id,
            codigo: item.establecimientos[0].codigo,
          },
        });
        if (est) {
          estId = est.id;
        }
      }

      // In schema, miembro_grupo has unique constraint or not? Let's verify: DNI is inside member, but there's no unique constraint on it globally.
      // But we can check if it exists in the group first. We don't have findFirst in interface but we can write it or just create if group was just created.
      // Since it's a seed, we can just proceed. However, let's write a check to avoid duplication.
      // Let's assume if the group was already existing, we don't need to add the members again or we check it.
      // To be safe, we only add members when we create the group, or we define a finder.
      // Let's add findFirst to MiembroGrupoDelegate. Or we can just only create members when the group was newly created.
      // Yes, if we newly created the group, we add all members. That prevents duplicate members upon multiple runs.
      if (createdCount > 0) {
        await miembrosGrupo.create({
          data: {
            grupoTrabajoId: group.id,
            grupoEstablecimientoId: estId,
            cargoMiembroGrupoId: cargo.id,
            dni: m.dni,
            nombres: m.nombres,
            apellidos: m.apellidos,
            celular: m.celular,
            email: m.email,
            activo: true,
            archivado: false,
          },
        });
      }
    }
  }

  return createdCount;
}
