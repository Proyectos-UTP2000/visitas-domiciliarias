/*
  Warnings:

  - You are about to drop the column `centro_poblado` on the `actor_social` table. All the data in the column will be lost.
  - You are about to drop the column `centro_poblado_rural` on the `actor_social` table. All the data in the column will be lost.
  - You are about to drop the column `vd_calidad` on the `actor_social` table. All the data in the column will be lost.
  - You are about to drop the column `centro_poblado` on the `sector` table. All the data in the column will be lost.
  - Added the required column `centro_poblado_id` to the `sector` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "actor_social" DROP COLUMN "centro_poblado",
DROP COLUMN "centro_poblado_rural",
DROP COLUMN "vd_calidad",
ADD COLUMN     "centro_poblado_id" UUID;

-- AlterTable
ALTER TABLE "sector" DROP COLUMN "centro_poblado",
ADD COLUMN     "centro_poblado_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "centro_poblado" (
    "id" UUID NOT NULL,
    "municipalidad_id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo" VARCHAR(50),
    "tipo" VARCHAR(50) NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "poblacion" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centro_poblado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "centro_poblado_municipalidad_id_nombre_tipo_key" ON "centro_poblado"("municipalidad_id", "nombre", "tipo");

-- AddForeignKey
ALTER TABLE "sector" ADD CONSTRAINT "sector_centro_poblado_id_fkey" FOREIGN KEY ("centro_poblado_id") REFERENCES "centro_poblado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_social" ADD CONSTRAINT "actor_social_centro_poblado_id_fkey" FOREIGN KEY ("centro_poblado_id") REFERENCES "centro_poblado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centro_poblado" ADD CONSTRAINT "centro_poblado_municipalidad_id_fkey" FOREIGN KEY ("municipalidad_id") REFERENCES "municipalidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
