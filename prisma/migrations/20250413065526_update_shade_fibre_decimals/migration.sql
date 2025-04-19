/*
  Warnings:

  - You are about to alter the column `percentage` on the `shade_fibres` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE "shade_fibres" ALTER COLUMN "percentage" SET DATA TYPE DECIMAL(5,2);
