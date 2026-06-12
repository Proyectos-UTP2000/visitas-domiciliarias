import { config as loadEnv } from "dotenv";
import { hashPassword } from "../shared/password.js";
import { prisma } from "../shared/prisma.js";
import { seedInitialAdmin } from "./initial-admin.loader.js";
import { seedTiposActorSocial } from "./tipos-actor-social.loader.js";

loadEnv({ path: "../../.env" });
loadEnv();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "SEED_ADMIN_USERNAME y SEED_ADMIN_PASSWORD son obligatorios para ejecutar el DataLoader inicial"
    );
  }

  const result = await seedInitialAdmin({
    users: prisma.usuario,
    hashPassword,
    config: { username, password }
  });

  console.log(
    result.created
      ? `DataLoader: usuario administrador inicial creado (${result.username})`
      : `DataLoader: usuario administrador inicial ya existía (${result.username})`
  );

  const typesCreated = await seedTiposActorSocial(prisma.tipoActorSocial);
  console.log(`DataLoader: ${typesCreated} tipos de actor social creados.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
