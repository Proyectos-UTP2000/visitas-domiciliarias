export const DEFAULT_SECTORES = [
  // Pomahuaca (POM)
  {
    municipalidadCodigo: "POM",
    centroPobladoCodigo: "CP-POM-URB-01",
    codigo: "SEC-URB-POM-01",
    nombreSector: "Sector Urbano Pomahuaca 1",
    tipoSector: "URBANO" as const,
    departamento: "CAJAMARCA",
    provincia: "JAEN",
    distrito: "POMAHUACA",
    urbano: { zona: "001", manzana: "A" },
    rural: null,
  },
  {
    municipalidadCodigo: "POM",
    centroPobladoCodigo: "CP-POM-URB-01",
    codigo: "SEC-URB-POM-02",
    nombreSector: "Sector Urbano Pomahuaca 2",
    tipoSector: "URBANO" as const,
    departamento: "CAJAMARCA",
    provincia: "JAEN",
    distrito: "POMAHUACA",
    urbano: { zona: "001", manzana: "B" },
    rural: null,
  },
  {
    municipalidadCodigo: "POM",
    centroPobladoCodigo: "CP-POM-RUR-01",
    codigo: "SEC-RUR-POM-01",
    nombreSector: "Sector Rural Pomahuaca 1",
    tipoSector: "RURAL" as const,
    departamento: "CAJAMARCA",
    provincia: "JAEN",
    distrito: "POMAHUACA",
    urbano: null,
    rural: { latitud: -5.92, longitud: -78.68, poblacion: 150 },
  },
  // Lima (LIM)
  {
    municipalidadCodigo: "LIM",
    centroPobladoCodigo: "CP-LIM-URB-01",
    codigo: "SEC-URB-LIM-01",
    nombreSector: "Sector Urbano Lima 1",
    tipoSector: "URBANO" as const,
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LIMA",
    urbano: { zona: "002", manzana: "C" },
    rural: null,
  },
  {
    municipalidadCodigo: "LIM",
    centroPobladoCodigo: "CP-LIM-URB-01",
    codigo: "SEC-URB-LIM-02",
    nombreSector: "Sector Urbano Lima 2",
    tipoSector: "URBANO" as const,
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LIMA",
    urbano: { zona: "002", manzana: "D" },
    rural: null,
  },
  // La Victoria (VIC)
  {
    municipalidadCodigo: "VIC",
    centroPobladoCodigo: "CP-VIC-URB-01",
    codigo: "SEC-URB-VIC-01",
    nombreSector: "Sector Urbano La Victoria 1",
    tipoSector: "URBANO" as const,
    departamento: "LAMBAYEQUE",
    provincia: "CHICLAYO",
    distrito: "LA VICTORIA",
    urbano: { zona: "003", manzana: "E" },
    rural: null,
  },
  {
    municipalidadCodigo: "VIC",
    centroPobladoCodigo: "CP-VIC-URB-01",
    codigo: "SEC-URB-VIC-02",
    nombreSector: "Sector Urbano La Victoria 2",
    tipoSector: "URBANO" as const,
    departamento: "LAMBAYEQUE",
    provincia: "CHICLAYO",
    distrito: "LA VICTORIA",
    urbano: { zona: "003", manzana: "F" },
    rural: null,
  },
  {
    municipalidadCodigo: "VIC",
    centroPobladoCodigo: "CP-VIC-RUR-01",
    codigo: "SEC-RUR-VIC-01",
    nombreSector: "Sector Rural La Victoria 1",
    tipoSector: "RURAL" as const,
    departamento: "LAMBAYEQUE",
    provincia: "CHICLAYO",
    distrito: "LA VICTORIA",
    urbano: null,
    rural: { latitud: -6.80, longitud: -79.84, poblacion: 300 },
  }
];

type SectorUniqueCheck = {
  findUnique(args: {
    where: { municipalidadId_codigo: { municipalidadId: string; codigo: string } };
  }): Promise<unknown | null>;
  create(args: {
    data: {
      municipalidadId: string;
      centroPobladoId: string;
      codigo: string;
      departamento: string;
      provincia: string;
      distrito: string;
      nombreSector: string;
      tipoSector: "URBANO" | "RURAL";
      urbano?: { create: { zona: string; manzana: string } } | null;
      rural?: { create: { latitud?: number | null; longitud?: number | null; poblacion?: number | null } } | null;
      activo: boolean;
      archivado: boolean;
    };
  }): Promise<unknown>;
};

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type CentroPobladoFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type SeedSectoresDependencies = {
  sectores: SectorUniqueCheck;
  municipalidades: MunicipalidadFinder;
  centrosPoblados: CentroPobladoFinder;
};

export async function seedSectores({
  sectores,
  municipalidades,
  centrosPoblados,
}: SeedSectoresDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_SECTORES) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(`DataLoader Sectores: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando sector ${item.codigo}.`);
      continue;
    }

    const existing = await sectores.findUnique({
      where: {
        municipalidadId_codigo: {
          municipalidadId: muni.id,
          codigo: item.codigo,
        },
      },
    });

    if (existing) {
      continue;
    }

    const cp = await centrosPoblados.findFirst({
      where: { codigo: item.centroPobladoCodigo },
    });

    if (!cp) {
      console.warn(`DataLoader Sectores: Centro Poblado con código ${item.centroPobladoCodigo} no encontrado. Saltando sector ${item.codigo}.`);
      continue;
    }

    const data: any = {
      municipalidadId: muni.id,
      centroPobladoId: cp.id,
      codigo: item.codigo,
      departamento: item.departamento,
      provincia: item.provincia,
      distrito: item.distrito,
      nombreSector: item.nombreSector,
      tipoSector: item.tipoSector,
      activo: true,
      archivado: false,
    };

    if (item.tipoSector === "URBANO" && item.urbano) {
      data.urbano = {
        create: {
          zona: item.urbano.zona,
          manzana: item.urbano.manzana,
        },
      };
    } else if (item.tipoSector === "RURAL" && item.rural) {
      data.rural = {
        create: {
          latitud: item.rural.latitud,
          longitud: item.rural.longitud,
          poblacion: item.rural.poblacion,
        },
      };
    }

    await sectores.create({ data });
    createdCount++;
  }

  return createdCount;
}
