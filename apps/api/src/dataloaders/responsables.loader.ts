export const DEFAULT_RESPONSABLES = [
  {
    municipalidadCodigo: "VIC",
    tipoDocumento: "DNI",
    dni: "11112222",
    nombres: "Maria Carmen",
    apellidos: "Delgado Flores",
    celular: "911222333",
    email: "maria.delgado@gmail.com",
  },
  {
    municipalidadCodigo: "VIC",
    tipoDocumento: "DNI",
    dni: "22223333",
    nombres: "Juan Carlos",
    apellidos: "Perez Quispe",
    celular: "922333444",
    email: "juan.perez@gmail.com",
  },
  {
    municipalidadCodigo: "POM",
    tipoDocumento: "DNI",
    dni: "33334444",
    nombres: "Rosa Elena",
    apellidos: "Tafur Lopez",
    celular: "933444555",
    email: "rosa.tafur@gmail.com",
  }
];

type ResponsableDelegate = {
  findUnique(args: {
    where: {
      municipalidadId_tipoDocumento_dni: {
        municipalidadId: string;
        tipoDocumento: string;
        dni: string;
      };
    };
  }): Promise<unknown | null>;
  create(args: {
    data: {
      municipalidadId: string;
      tipoDocumento: string;
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

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type SeedResponsablesDependencies = {
  responsables: ResponsableDelegate;
  municipalidades: MunicipalidadFinder;
};

export async function seedResponsables({
  responsables,
  municipalidades,
}: SeedResponsablesDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_RESPONSABLES) {
    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(
        `DataLoader Responsables: Municipalidad con código ${item.municipalidadCodigo} no encontrada. Saltando responsable ${item.dni}.`
      );
      continue;
    }

    const existing = await responsables.findUnique({
      where: {
        municipalidadId_tipoDocumento_dni: {
          municipalidadId: muni.id,
          tipoDocumento: item.tipoDocumento,
          dni: item.dni,
        },
      },
    });

    if (existing) {
      continue;
    }

    await responsables.create({
      data: {
        municipalidadId: muni.id,
        tipoDocumento: item.tipoDocumento,
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        celular: item.celular,
        email: item.email,
        activo: true,
        archivado: false,
      },
    });

    createdCount++;
  }

  return createdCount;
}
