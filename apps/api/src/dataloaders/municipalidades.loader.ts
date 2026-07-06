export const DEFAULT_MUNICIPALIDADES = [
  {
    ubigeo: "060806",
    departamento: "CAJAMARCA",
    provincia: "JAEN",
    distrito: "POMAHUACA",
    codigo: "POM",
    nombre: "MUNICIPALIDAD DISTRITAL DE POMAHUACA",
    tipo: "DISTRITAL" as const,
    prioridad: 1,
  },
  {
    ubigeo: "150101",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LIMA",
    codigo: "LIM",
    nombre: "MUNICIPALIDAD METROPOLITANA DE LIMA",
    tipo: "PROVINCIAL" as const,
    prioridad: 2,
  }
];

type MunicipalidadDelegate = {
  findUnique(args: {
    where: { ubigeo_codigo: { ubigeo: string; codigo: string } };
  }): Promise<unknown | null>;
  create(args: {
    data: {
      ubigeo: string;
      departamento: string;
      provincia: string;
      distrito: string;
      codigo: string;
      nombre: string;
      tipo: "PROVINCIAL" | "DISTRITAL";
      prioridad: number;
      activo: boolean;
      archivado: boolean;
    };
  }): Promise<unknown>;
};

export async function seedMunicipalidades(db: MunicipalidadDelegate): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_MUNICIPALIDADES) {
    const existing = await db.findUnique({
      where: {
        ubigeo_codigo: { ubigeo: item.ubigeo, codigo: item.codigo }
      }
    });
    if (!existing) {
      await db.create({
        data: {
          ...item,
          activo: true,
          archivado: false,
        },
      });
      createdCount++;
    }
  }

  return createdCount;
}
