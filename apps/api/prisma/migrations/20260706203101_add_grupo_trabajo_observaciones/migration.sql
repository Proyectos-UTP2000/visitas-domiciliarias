-- AlterEnum
ALTER TYPE "EstadoGrupoTrabajo" ADD VALUE 'RECHAZADO';

-- AlterTable
ALTER TABLE "grupo_trabajo" ADD COLUMN     "observaciones" TEXT;
