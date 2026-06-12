type SeedUserDelegate = {
  findUnique(args: { where: { username: string } }): Promise<unknown | null>;
  create(args: {
    data: {
      username: string;
      passwordHash: string;
      rol: "ADMIN_GENERAL";
      activo: true;
      municipalidadId: null;
    };
  }): Promise<unknown>;
};

type SeedInitialAdminDependencies = {
  users: SeedUserDelegate;
  hashPassword(password: string): Promise<string>;
  config: {
    username: string;
    password: string;
  };
};

type SeedInitialAdminResult = {
  created: boolean;
  username: string;
};

export async function seedInitialAdmin({
  users,
  hashPassword,
  config
}: SeedInitialAdminDependencies): Promise<SeedInitialAdminResult> {
  const username = config.username.trim();
  const existingUser = await users.findUnique({ where: { username } });

  if (existingUser) {
    return { created: false, username };
  }

  const passwordHash = await hashPassword(config.password);

  await users.create({
    data: {
      username,
      passwordHash,
      rol: "ADMIN_GENERAL",
      activo: true,
      municipalidadId: null
    }
  });

  return { created: true, username };
}
