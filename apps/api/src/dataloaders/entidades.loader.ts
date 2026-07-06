export const DEFAULT_ENTIDADES = [
  { tipoEntidad: "Otras entidades públicas", codigo: "MIDIS", nombre: "MIDIS" },
  { tipoEntidad: "Otras entidades públicas", codigo: "CUNAMAS", nombre: "Cuna Mas" },
  { tipoEntidad: "Otras entidades públicas", codigo: "VASODELECHE", nombre: "Vaso de Leche" },
  { tipoEntidad: "Otras entidades públicas", codigo: "CLUBDEMADRES", nombre: "Club de Madres" },
  { tipoEntidad: "Otras entidades públicas", codigo: "DIRESA_LORETO", nombre: "Dirección Regional de Salud Loreto" },
  { tipoEntidad: "Otras entidades públicas", codigo: "COMEDORES", nombre: "Comedores Populares" },
  { tipoEntidad: "Otras entidades públicas", codigo: "CS_SJM", nombre: "Centro de Salud San Juan de Miraflores" },
  { tipoEntidad: "Otras entidades públicas", codigo: "INIA", nombre: "INIA" },
  { tipoEntidad: "Entidad Privada", codigo: "ONG_PRISMA", nombre: "ONG PRISMA" },
  { tipoEntidad: "Otras entidades públicas", codigo: "DEMUNA", nombre: "DEMUNA" },
  { tipoEntidad: "Otras entidades públicas", codigo: "DIRIS_LN", nombre: "DIRIS Lima Norte - MINSA" },
  { tipoEntidad: "Otras entidades públicas", codigo: "JUZGADO_PAZ", nombre: "Juzgado de Paz Única Nominacion" },
  { tipoEntidad: "Otras entidades públicas", codigo: "HN_CAYETANO", nombre: "Hospital Nacional Cayetano Heredia" },
  { tipoEntidad: "Otras entidades públicas", codigo: "CEDICOPA", nombre: "Central Distrital de Comedores Autogestionarios - CEDICOPA" },
  { tipoEntidad: "Otras entidades públicas", codigo: "ALTERNATIVA", nombre: "Alternativa Centro de Investigación y Educación Popular - ONG" },
  { tipoEntidad: "Otras entidades públicas", codigo: "CAR_GRACIA", nombre: "CAR Gracia - INABIF" },
  { tipoEntidad: "Otras entidades públicas", codigo: "PS_POMAHUACA", nombre: "Puesto de Salud Pomahuaca" },
  { tipoEntidad: "Otras entidades públicas", codigo: "PS_MANGAYPA", nombre: "Puesto de Salud Mangaypa" },
  { tipoEntidad: "Otras entidades públicas", codigo: "MD_POMAHUACA_ATM", nombre: "Municipalidad Distrital de Pomahuaca ATM" },
  { tipoEntidad: "Otras entidades públicas", codigo: "JUNTOS", nombre: "Gestor Local Programa Juntos" }
];

type EntidadDelegate = {
  findUnique(args: {
    where: { tipoEntidad_codigo: { tipoEntidad: string; codigo: string } };
  }): Promise<unknown | null>;
  create(args: {
    data: {
      tipoEntidad: string;
      codigo: string;
      nombre: string;
      activo: boolean;
      archivado: boolean;
    };
  }): Promise<unknown>;
};

export async function seedEntidades(db: EntidadDelegate): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_ENTIDADES) {
    const existing = await db.findUnique({
      where: {
        tipoEntidad_codigo: { tipoEntidad: item.tipoEntidad, codigo: item.codigo }
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
