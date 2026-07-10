-- CreateEnum
CREATE TYPE "TipoAccionAsignacion" AS ENUM ('ASIGNACION', 'DESASIGNACION');

-- CreateTable
CREATE TABLE "historial_asignacion_territorial" (
    "id" UUID NOT NULL,
    "actor_social_id" UUID NOT NULL,
    "sector_id" UUID NOT NULL,
    "tipo_accion" "TipoAccionAsignacion" NOT NULL,
    "motivo" TEXT NOT NULL,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_asignacion_territorial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historial_asignacion_territorial" ADD CONSTRAINT "historial_asignacion_territorial_actor_social_id_fkey" FOREIGN KEY ("actor_social_id") REFERENCES "actor_social"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_asignacion_territorial" ADD CONSTRAINT "historial_asignacion_territorial_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_asignacion_territorial" ADD CONSTRAINT "historial_asignacion_territorial_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
