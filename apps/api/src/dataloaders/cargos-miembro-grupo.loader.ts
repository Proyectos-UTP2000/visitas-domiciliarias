export const DEFAULT_CARGOS = [
  { nombre: "Presidente", descripcion: "Presidente del grupo de trabajo", orden: 1 },
  { nombre: "Secretario", descripcion: "Secretario encargado de actas", orden: 2 },
  { nombre: "Coordinador", descripcion: "Coordinador de actividades y visitas", orden: 3 },
  { nombre: "Responsable de actividades", descripcion: "Responsable operativo", orden: 4 }
];

type CargoMiembroGrupoDelegate = {
  findUnique(args: {
    where: { nombre: string };
  }): Promise<unknown | null>;
  create(args: {
    data: {
      nombre: string;
      descripcion: string | null;
      orden: number;
      activo: boolean;
    };
  }): Promise<unknown>;
};

export async function seedCargosMiembroGrupo(db: CargoMiembroGrupoDelegate): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_CARGOS) {
    const existing = await db.findUnique({
      where: {
        nombre: item.nombre
      }
    });
    if (!existing) {
      await db.create({
        data: {
          ...item,
          activo: true,
        },
      });
      createdCount++;
    }
  }

  return createdCount;
}
