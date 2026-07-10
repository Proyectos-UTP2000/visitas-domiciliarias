export const DEFAULT_NINOS = [
  {
    municipalidadCodigo: "VIC",
    responsableDni: "11112222",
    sectorCodigo: "SEC-URB-VIC-01",
    dni: "55556666",
    cnv: "CNV-VIC-001",
    nombres: "Thiago Mateo",
    apellidos: "Delgado Flores",
    sexo: "MASCULINO" as const,
    fechaNac: new Date("2026-01-15"),
    direccion: "Av. Larco 123",
    referencia: "Frente a la plaza principal",
    latitud: -6.791,
    longitud: -79.842,
  },
  {
    municipalidadCodigo: "VIC",
    responsableDni: "22223333",
    sectorCodigo: "SEC-URB-VIC-02",
    dni: "66667777",
    cnv: "CNV-VIC-002",
    nombres: "Valentina Sofia",
    apellidos: "Perez Quispe",
    sexo: "FEMENINO" as const,
    fechaNac: new Date("2025-09-20"),
    direccion: "Calle Bolognesi 456",
    referencia: "A una cuadra del grifo",
    latitud: -6.795,
    longitud: -79.845,
  },
  {
    municipalidadCodigo: "POM",
    responsableDni: "33334444",
    sectorCodigo: "SEC-URB-POM-01",
    dni: "77778888",
    cnv: "CNV-POM-001",
    nombres: "Liam Gael",
    apellidos: "Tafur Lopez",
    sexo: "MASCULINO" as const,
    fechaNac: new Date("2025-11-10"),
    direccion: "Jiron Lima 789",
    referencia: "Cerca del centro de salud",
    latitud: -5.922,
    longitud: -78.681,
  }
];

type NinoDelegate = {
  findFirst(args: {
    where: {
      municipalidadId: string;
      dni?: string | null;
    };
  }): Promise<{ id: string } | null>;
  create(args: {
    data: {
      municipalidadId: string;
      responsableId: string;
      sectorId?: string | null;
      dni?: string | null;
      cnv?: string | null;
      nombres: string;
      apellidos: string;
      sexo: "MASCULINO" | "FEMENINO";
      fechaNac: Date;
      direccion: string;
      referencia?: string | null;
      latitud?: number | null;
      longitud?: number | null;
      activo: boolean;
      archivado: boolean;
    };
  }): Promise<unknown>;
};

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type ResponsableFinder = {
  findFirst(args: {
    where: { municipalidadId: string; dni: string };
  }): Promise<{ id: string } | null>;
};

type SectorFinder = {
  findUnique(args: {
    where: { municipalidadId_codigo: { municipalidadId: string; codigo: string } };
  }): Promise<{ id: string } | null>;
};

type SeedNinosDependencies = {
  ninos: NinoDelegate;
  municipalidades: MunicipalidadFinder;
  responsables: ResponsableFinder;
  sectores: SectorFinder;
};

export async function seedNinos({
  ninos,
  municipalidades,
  responsables,
  sectores,
}: SeedNinosDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_NINOS) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(
        `DataLoader Ninos: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando niño ${item.nombres}.`
      );
      continue;
    }

    // Check duplicate by municipalidadId & DNI
    let existing = null;
    if (item.dni) {
      existing = await ninos.findFirst({
        where: {
          municipalidadId: muni.id,
          dni: item.dni,
        },
      });
    }

    if (existing) {
      continue;
    }

    // Resolve responsable
    const resp = await responsables.findFirst({
      where: {
        municipalidadId: muni.id,
        dni: item.responsableDni,
      },
    });

    if (!resp) {
      console.warn(
        `DataLoader Ninos: Responsable con DNI ${item.responsableDni} no encontrado. Saltando niño ${item.nombres}.`
      );
      continue;
    }

    // Resolve sector if present
    let sectorId: string | null = null;
    if (item.sectorCodigo) {
      const sec = await sectores.findUnique({
        where: {
          municipalidadId_codigo: {
            municipalidadId: muni.id,
            codigo: item.sectorCodigo,
          },
        },
      });
      if (sec) {
        sectorId = sec.id;
      } else {
        console.warn(
          `DataLoader Ninos: Sector con código ${item.sectorCodigo} no encontrado. Saltando niño ${item.nombres}.`
        );
        continue;
      }
    }

    await ninos.create({
      data: {
        municipalidadId: muni.id,
        responsableId: resp.id,
        sectorId,
        dni: item.dni,
        cnv: item.cnv,
        nombres: item.nombres,
        apellidos: item.apellidos,
        sexo: item.sexo,
        fechaNac: item.fechaNac,
        direccion: item.direccion,
        referencia: item.referencia,
        latitud: item.latitud,
        longitud: item.longitud,
        activo: true,
        archivado: false,
      },
    });

    createdCount++;
  }

  return createdCount;
}
