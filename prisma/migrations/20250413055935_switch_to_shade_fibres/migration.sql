/*
  Warnings:

  - You are about to drop the `shade_blends` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "shade_blends" DROP CONSTRAINT "shade_blends_blend_id_fkey";

-- DropForeignKey
ALTER TABLE "shade_blends" DROP CONSTRAINT "shade_blends_shade_id_fkey";

-- DropTable
DROP TABLE "shade_blends";

-- CreateTable
CREATE TABLE "shade_fibres" (
    "id" UUID NOT NULL,
    "shade_id" UUID NOT NULL,
    "fibre_id" UUID NOT NULL,
    "percentage" INTEGER NOT NULL,

    CONSTRAINT "shade_fibres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shade_fibres_shade_id_fibre_id_key" ON "shade_fibres"("shade_id", "fibre_id");

-- AddForeignKey
ALTER TABLE "shade_fibres" ADD CONSTRAINT "shade_fibres_shade_id_fkey" FOREIGN KEY ("shade_id") REFERENCES "shades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shade_fibres" ADD CONSTRAINT "shade_fibres_fibre_id_fkey" FOREIGN KEY ("fibre_id") REFERENCES "fibres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
