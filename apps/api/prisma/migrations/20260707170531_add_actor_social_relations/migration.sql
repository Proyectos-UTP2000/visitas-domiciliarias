-- AlterTable
ALTER TABLE "actor_social" ADD COLUMN     "centro_poblado_rural" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "grupo_establecimiento_id" UUID,
ADD COLUMN     "inactivado_permanentemente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vd_calidad" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_ActorSocialSectores" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ActorSocialSectores_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ActorSocialSectoresACorregir" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ActorSocialSectoresACorregir_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ActorSocialSectores_B_index" ON "_ActorSocialSectores"("B");

-- CreateIndex
CREATE INDEX "_ActorSocialSectoresACorregir_B_index" ON "_ActorSocialSectoresACorregir"("B");

-- AddForeignKey
ALTER TABLE "actor_social" ADD CONSTRAINT "actor_social_grupo_establecimiento_id_fkey" FOREIGN KEY ("grupo_establecimiento_id") REFERENCES "grupo_establecimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActorSocialSectores" ADD CONSTRAINT "_ActorSocialSectores_A_fkey" FOREIGN KEY ("A") REFERENCES "actor_social"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActorSocialSectores" ADD CONSTRAINT "_ActorSocialSectores_B_fkey" FOREIGN KEY ("B") REFERENCES "sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActorSocialSectoresACorregir" ADD CONSTRAINT "_ActorSocialSectoresACorregir_A_fkey" FOREIGN KEY ("A") REFERENCES "actor_social"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActorSocialSectoresACorregir" ADD CONSTRAINT "_ActorSocialSectoresACorregir_B_fkey" FOREIGN KEY ("B") REFERENCES "sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
