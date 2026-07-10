-- CreateEnum
CREATE TYPE "SexoNino" AS ENUM ('MASCULINO', 'FEMENINO');

-- CreateEnum
CREATE TYPE "EstadoVisita" AS ENUM ('PROGRAMADA', 'EJECUTADA', 'REPROGRAMADA', 'INCONCLUSA');

-- CreateTable
CREATE TABLE "responsable" (
    "id" UUID NOT NULL,
    "municipalidad_id" UUID NOT NULL,
    "tipo_documento" VARCHAR(20) NOT NULL,
    "dni" VARCHAR(15) NOT NULL,
    "nombres" VARCHAR(150) NOT NULL,
    "apellidos" VARCHAR(150) NOT NULL,
    "celular" VARCHAR(9),
    "email" VARCHAR(150),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nino" (
    "id" UUID NOT NULL,
    "municipalidad_id" UUID NOT NULL,
    "responsable_id" UUID NOT NULL,
    "sector_id" UUID,
    "dni" VARCHAR(8),
    "cnv" VARCHAR(20),
    "nombres" VARCHAR(150) NOT NULL,
    "apellidos" VARCHAR(150) NOT NULL,
    "sexo" "SexoNino" NOT NULL,
    "fecha_nac" DATE NOT NULL,
    "direccion" VARCHAR(200) NOT NULL,
    "referencia" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "motivo_eliminacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_nino_social" (
    "id" UUID NOT NULL,
    "nino_id" UUID NOT NULL,
    "actor_social_id" UUID NOT NULL,
    "asignado_por_id" UUID NOT NULL,
    "motivo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignacion_nino_social_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita_domiciliaria" (
    "id" UUID NOT NULL,
    "nino_id" UUID NOT NULL,
    "actor_social_id" UUID NOT NULL,
    "fecha_programada" DATE NOT NULL,
    "fecha_ejecucion" TIMESTAMP(3),
    "estado" "EstadoVisita" NOT NULL DEFAULT 'PROGRAMADA',
    "motivo_inconclusa" TEXT,
    "peso" DOUBLE PRECISION,
    "hierro_entregado" BOOLEAN,
    "consejeria_brindada" BOOLEAN,
    "alertas" TEXT,
    "comentarios" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visita_domiciliaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "responsable_municipalidad_id_tipo_documento_dni_key" ON "responsable"("municipalidad_id", "tipo_documento", "dni");

-- CreateIndex
CREATE UNIQUE INDEX "nino_municipalidad_id_dni_key" ON "nino"("municipalidad_id", "dni");

-- AddForeignKey
ALTER TABLE "responsable" ADD CONSTRAINT "responsable_municipalidad_id_fkey" FOREIGN KEY ("municipalidad_id") REFERENCES "municipalidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nino" ADD CONSTRAINT "nino_municipalidad_id_fkey" FOREIGN KEY ("municipalidad_id") REFERENCES "municipalidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nino" ADD CONSTRAINT "nino_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "responsable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nino" ADD CONSTRAINT "nino_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_nino_social" ADD CONSTRAINT "asignacion_nino_social_nino_id_fkey" FOREIGN KEY ("nino_id") REFERENCES "nino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_nino_social" ADD CONSTRAINT "asignacion_nino_social_actor_social_id_fkey" FOREIGN KEY ("actor_social_id") REFERENCES "actor_social"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_nino_social" ADD CONSTRAINT "asignacion_nino_social_asignado_por_id_fkey" FOREIGN KEY ("asignado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_domiciliaria" ADD CONSTRAINT "visita_domiciliaria_nino_id_fkey" FOREIGN KEY ("nino_id") REFERENCES "nino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_domiciliaria" ADD CONSTRAINT "visita_domiciliaria_actor_social_id_fkey" FOREIGN KEY ("actor_social_id") REFERENCES "actor_social"("id") ON DELETE CASCADE ON UPDATE CASCADE;
