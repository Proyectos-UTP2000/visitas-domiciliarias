import { config as loadEnv } from "dotenv";
import { hashPassword } from "../shared/password.js";
import { prisma } from "../shared/prisma.js";
import { seedInitialAdmin } from "./initial-admin.loader.js";
import { seedTiposActorSocial } from "./tipos-actor-social.loader.js";
import { seedMunicipalidades } from "./municipalidades.loader.js";
import { seedEntidades } from "./entidades.loader.js";
import { seedCargosMiembroGrupo } from "./cargos-miembro-grupo.loader.js";
import { seedCentrosPoblados } from "./centros-poblados.loader.js";
import { seedUsuariosMunicipales } from "./usuarios-municipales.loader.js";
import { seedSectores } from "./sectores.loader.js";
import { seedGruposTrabajo } from "./grupos-trabajo.loader.js";
import { seedActoresSociales } from "./actores-sociales.loader.js";
import { seedResponsables } from "./responsables.loader.js";
import { seedNinos } from "./ninos.loader.js";
import { seedAsignacionesNinos } from "./asignaciones-ninos.loader.js";
import { seedVisitasDomiciliarias } from "./visitas-domiciliarias.loader.js";

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

  const municipalidadesCreated = await seedMunicipalidades(prisma.municipalidad);
  console.log(`DataLoader: ${municipalidadesCreated} municipalidades creadas.`);

  const entidadesCreated = await seedEntidades(prisma.entidad);
  console.log(`DataLoader: ${entidadesCreated} entidades creadas.`);

  const cargosCreated = await seedCargosMiembroGrupo(prisma.cargoMiembroGrupo);
  console.log(`DataLoader: ${cargosCreated} cargos de miembro de grupo creados.`);

  const cpsCreated = await seedCentrosPoblados({
    municipalidades: prisma.municipalidad,
    centrosPoblados: prisma.centroPoblado,
  });
  console.log(`DataLoader: ${cpsCreated} centros poblados creados.`);

  const usersMuniCreated = await seedUsuariosMunicipales({
    users: prisma.usuario,
    municipalidades: prisma.municipalidad,
    hashPassword,
  });
  console.log(`DataLoader: ${usersMuniCreated} usuarios municipales creados.`);

  const sectoresCreated = await seedSectores({
    sectores: prisma.sector,
    municipalidades: prisma.municipalidad,
    centrosPoblados: prisma.centroPoblado,
  });
  console.log(`DataLoader: ${sectoresCreated} sectores creados.`);

  const gruposCreated = await seedGruposTrabajo({
    gruposTrabajo: prisma.grupoTrabajo,
    municipalidades: prisma.municipalidad,
    cargosMiembroGrupo: prisma.cargoMiembroGrupo,
    miembrosGrupo: prisma.miembroGrupo,
    grupoEstablecimientos: prisma.grupoEstablecimiento,
  });
  console.log(`DataLoader: ${gruposCreated} grupos de trabajo creados.`);

  const actoresCreated = await seedActoresSociales({
    users: prisma.usuario,
    actoresSociales: prisma.actorSocial,
    municipalidades: prisma.municipalidad,
    tiposActorSocial: prisma.tipoActorSocial,
    gruposTrabajo: prisma.grupoTrabajo,
    grupoEstablecimientos: prisma.grupoEstablecimiento,
    centrosPoblados: prisma.centroPoblado,
    sectores: prisma.sector,
    hashPassword,
  });
  console.log(`DataLoader: ${actoresCreated} actores sociales creados.`);

  const responsablesCreated = await seedResponsables({
    responsables: prisma.responsable,
    municipalidades: prisma.municipalidad,
  });
  console.log(`DataLoader: ${responsablesCreated} responsables creados.`);

  const ninosCreated = await seedNinos({
    ninos: prisma.nino,
    municipalidades: prisma.municipalidad,
    responsables: prisma.responsable,
    sectores: prisma.sector,
  });
  console.log(`DataLoader: ${ninosCreated} niños creados.`);

  const asignacionesCreated = await seedAsignacionesNinos({
    asignaciones: prisma.asignacionNinoSocial,
    municipalidades: prisma.municipalidad,
    ninos: prisma.nino,
    actoresSociales: prisma.actorSocial,
    usuarios: prisma.usuario,
  });
  console.log(`DataLoader: ${asignacionesCreated} asignaciones de niños creadas.`);

  const visitasCreated = await seedVisitasDomiciliarias({
    visitas: prisma.visitaDomiciliaria,
    municipalidades: prisma.municipalidad,
    ninos: prisma.nino,
    actoresSociales: prisma.actorSocial,
  });
  console.log(`DataLoader: ${visitasCreated} visitas domiciliarias creadas.`);
}


main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
