-- AlterEnum
BEGIN;
-- Map existing records from CAPACITADO to VALIDO
UPDATE "actor_social" SET "estado" = 'VALIDO' WHERE "estado"::text = 'CAPACITADO';

CREATE TYPE "EstadoActorSocial_new" AS ENUM ('BORRADOR', 'REGISTRADO', 'VALIDADO', 'APROBADO');
ALTER TABLE "actor_social" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "actor_social" ALTER COLUMN "estado" TYPE "EstadoActorSocial_new" USING (
    CASE "estado"::text
        WHEN 'VALIDO' THEN 'VALIDADO'::"EstadoActorSocial_new"
        ELSE "estado"::text::"EstadoActorSocial_new"
    END
);
ALTER TYPE "EstadoActorSocial" RENAME TO "EstadoActorSocial_old";
ALTER TYPE "EstadoActorSocial_new" RENAME TO "EstadoActorSocial";
DROP TYPE "EstadoActorSocial_old";
ALTER TABLE "actor_social" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';
COMMIT;

-- CreateTable
CREATE TABLE "actor_social_archivo" (
    "id" UUID NOT NULL,
    "actor_social_id" UUID NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_social_archivo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "actor_social_archivo" ADD CONSTRAINT "actor_social_archivo_actor_social_id_fkey" FOREIGN KEY ("actor_social_id") REFERENCES "actor_social"("id") ON DELETE CASCADE ON UPDATE CASCADE;
