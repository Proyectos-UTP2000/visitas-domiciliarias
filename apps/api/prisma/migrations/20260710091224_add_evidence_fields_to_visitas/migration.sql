-- AlterTable
ALTER TABLE "visita_domiciliaria" ADD COLUMN     "evidencia_url" TEXT,
ADD COLUMN     "latitud" VARCHAR(50),
ADD COLUMN     "longitud" VARCHAR(50),
ADD COLUMN     "tipo_registro" VARCHAR(100);
