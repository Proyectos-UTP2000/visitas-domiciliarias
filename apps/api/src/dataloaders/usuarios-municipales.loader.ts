export const DEFAULT_USUARIOS_MUNICIPALES = [
  {
    username: "admin_pom",
    password: "password123",
    municipalidadCodigo: "POM",
    rol: "ADMIN_MUNICIPAL" as const,
  },
  {
    username: "admin_lim",
    password: "password123",
    municipalidadCodigo: "LIM",
    rol: "ADMIN_MUNICIPAL" as const,
  },
  {
    username: "admin_vic",
    password: "password123",
    municipalidadCodigo: "VIC",
    rol: "ADMIN_MUNICIPAL" as const,
  },
  {
    username: "supervisor_pom",
    password: "password123",
    municipalidadCodigo: "POM",
    rol: "SUPERVISOR" as const,
  },
  {
    username: "supervisor_lim",
    password: "password123",
    municipalidadCodigo: "LIM",
    rol: "SUPERVISOR" as const,
  },
  {
    username: "supervisor_vic",
    password: "password123",
    municipalidadCodigo: "VIC",
    rol: "SUPERVISOR" as const,
  },
  {
    username: "salud_pom",
    password: "password123",
    municipalidadCodigo: "POM",
    rol: "PERSONAL_SALUD" as const,
  },
  {
    username: "salud_lim",
    password: "password123",
    municipalidadCodigo: "LIM",
    rol: "PERSONAL_SALUD" as const,
  },
  {
    username: "salud_vic",
    password: "password123",
    municipalidadCodigo: "VIC",
    rol: "PERSONAL_SALUD" as const,
  }
];

type UserDelegate = {
  findUnique(args: { where: { username: string } }): Promise<unknown | null>;
  create(args: {
    data: {
      username: string;
      passwordHash: string;
      rol: "ADMIN_MUNICIPAL" | "SUPERVISOR" | "PERSONAL_SALUD";
      activo: boolean;
      municipalidadId: string;
    };
  }): Promise<unknown>;
};

type MunicipalidadFinder = {
  findFirst(args: { where: { codigo: string } }): Promise<{ id: string } | null>;
};

type SeedUsuariosMunicipalesDependencies = {
  users: UserDelegate;
  municipalidades: MunicipalidadFinder;
  hashPassword(password: string): Promise<string>;
};

export async function seedUsuariosMunicipales({
  users,
  municipalidades,
  hashPassword,
}: SeedUsuariosMunicipalesDependencies): Promise<number> {
  let createdCount = 0;

  for (const item of DEFAULT_USUARIOS_MUNICIPALES) {
    const existing = await users.findUnique({ where: { username: item.username } });
    if (existing) {
      continue;
    }

    const muni = await municipalidades.findFirst({
      where: { codigo: item.municipalidadCodigo },
    });

    if (!muni) {
      console.warn(`DataLoader UsuariosMunicipales: Municipalidad con código ${item.municipalidadCodigo} no encontrada para crear el usuario ${item.username}. Saltando.`);
      continue;
    }

    const passwordHash = await hashPassword(item.password);

    await users.create({
      data: {
        username: item.username,
        passwordHash,
        rol: item.rol,
        activo: true,
        municipalidadId: muni.id,
      },
    });

    createdCount++;
  }

  return createdCount;
}
