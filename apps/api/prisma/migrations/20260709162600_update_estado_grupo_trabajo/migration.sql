-- AlterEnum
BEGIN;
CREATE TYPE "EstadoGrupoTrabajo_new" AS ENUM ('BORRADOR', 'REGISTRADO', 'VALIDADO', 'APROBADO');
ALTER TABLE "public"."grupo_trabajo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "grupo_trabajo" ALTER COLUMN "estado" TYPE "EstadoGrupoTrabajo_new" USING ("estado"::text::"EstadoGrupoTrabajo_new");
ALTER TYPE "EstadoGrupoTrabajo" RENAME TO "EstadoGrupoTrabajo_old";
ALTER TYPE "EstadoGrupoTrabajo_new" RENAME TO "EstadoGrupoTrabajo";
DROP TYPE "public"."EstadoGrupoTrabajo_old";
ALTER TABLE "grupo_trabajo" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';
COMMIT;
