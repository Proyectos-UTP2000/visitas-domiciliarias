-- CreateTable
CREATE TABLE "grupo_trabajo_archivo" (
    "id" UUID NOT NULL,
    "grupo_trabajo_id" UUID NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_trabajo_archivo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "grupo_trabajo_archivo" ADD CONSTRAINT "grupo_trabajo_archivo_grupo_trabajo_id_fkey" FOREIGN KEY ("grupo_trabajo_id") REFERENCES "grupo_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
