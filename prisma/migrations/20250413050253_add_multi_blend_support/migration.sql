/*
  Warnings:

  - You are about to drop the column `available_stock_kg` on the `shades` table. All the data in the column will be lost.
  - You are about to drop the column `blend_id` on the `shades` table. All the data in the column will be lost.
  - Made the column `shade_code` on table `shades` required. This step will fail if there are existing NULL values in that column.
  - Made the column `shade_name` on table `shades` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "shades" DROP CONSTRAINT "shades_blend_id_fkey";

-- AlterTable
ALTER TABLE "shades" DROP COLUMN "available_stock_kg",
DROP COLUMN "blend_id",
ALTER COLUMN "shade_code" SET NOT NULL,
ALTER COLUMN "shade_name" SET NOT NULL;
