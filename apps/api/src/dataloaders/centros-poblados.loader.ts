export const DEFAULT_CENTROS_POBLADOS = [
  {
    municipalidadCodigo: "POM",
    nombre: "Pomahuaca Pueblo Central",
    tipo: "URBANO",
    codigo: "CP-POM-URB-01",
    latitud: null,
    longitud: null,
    poblacion: 1200,
  },
  {
    municipalidadCodigo: "POM",
    nombre: "Pomahuaca Rural Centro",
    tipo: "RURAL",
    codigo: "CP-POM-RUR-01",
    latitud: -5.9231,
    longitud: -78.6812,
    poblacion: 350,
  },
  {
    municipalidadCodigo: "LIM",
    nombre: "Cercado de Lima Urbano",
    tipo: "URBANO",
    codigo: "CP-LIM-URB-01",
    latitud: null,
    longitud: null,
    poblacion: 5000,
  },
  {
    municipalidadCodigo: "VIC",
    nombre: "La Victoria Urbano Central",
    tipo: "URBANO",
    codigo: "CP-VIC-URB-01",
    latitud: null,
    longitud: null,
    poblacion: 8000,
  },
  {
    municipalidadCodigo: "VIC",
    nombre: "La Victoria Rural Periferia",
    tipo: "RURAL",
    codigo: "CP-VIC-RUR-01",
    latitud: -6.7981,
    longitud: -79.8394,
    poblacion: 300,
  }
];

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type CentroPobladoDelegate = {
  findUnique(args: {
    where: {
      municipalidadId_nombre_tipo: {
        municipalidadId: string;
        nombre: string;
        tipo: string;
      };
    };
  }): Promise<unknown | null>;
  create(args: {
    data: {
      municipalidadId: string;
      nombre: string;
      codigo?: string | null;
      tipo: string;
      latitud?: number | null;
      longitud?: number | null;
      poblacion?: number | null;
      activo: boolean;
      archivado: boolean;
    };
  }): Promise<unknown>;
};

type SeedCentrosPobladosDependencies = {
  municipalidades: MunicipalidadFinder;
  centrosPoblados: CentroPobladoDelegate;
};

export async function seedCentrosPoblados({
  municipalidades,
  centrosPoblados,
}: SeedCentrosPobladosDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_CENTROS_POBLADOS) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(`DataLoader CentrosPoblados: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando.`);
      continue;
    }

    const existing = await centrosPoblados.findUnique({
      where: {
        municipalidadId_nombre_tipo: {
          municipalidadId: muni.id,
          nombre: item.nombre,
          tipo: item.tipo,
        },
      },
    });

    if (!existing) {
      await centrosPoblados.create({
        data: {
          municipalidadId: muni.id,
          nombre: item.nombre,
          codigo: item.codigo,
          tipo: item.tipo,
          latitud: item.latitud,
          longitud: item.longitud,
          poblacion: item.poblacion,
          activo: true,
          archivado: false,
        },
      });
      createdCount++;
    }
  }

  return createdCount;
}
