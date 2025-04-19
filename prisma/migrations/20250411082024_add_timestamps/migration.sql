/*
  Warnings:

  - You are about to drop the column `brand_id` on the `shades` table. All the data in the column will be lost.
  - You are about to drop the column `percentage` on the `shades` table. All the data in the column will be lost.
  - You are about to drop the `brands` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `files` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `machines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `production` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `suppliers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `yarn_mappings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `yarn_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `yarns` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_linked_yarn_id_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "machines" DROP CONSTRAINT "machines_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_created_by_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_yarn_id_fkey";

-- DropForeignKey
ALTER TABLE "production" DROP CONSTRAINT "production_entered_by_fkey";

-- DropForeignKey
ALTER TABLE "production" DROP CONSTRAINT "production_linked_order_id_fkey";

-- DropForeignKey
ALTER TABLE "production" DROP CONSTRAINT "production_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "shades" DROP CONSTRAINT "shades_brand_id_fkey";

-- DropForeignKey
ALTER TABLE "yarn_mappings" DROP CONSTRAINT "yarn_mappings_blend_id_fkey";

-- DropForeignKey
ALTER TABLE "yarn_mappings" DROP CONSTRAINT "yarn_mappings_brand_id_fkey";

-- DropForeignKey
ALTER TABLE "yarn_mappings" DROP CONSTRAINT "yarn_mappings_shade_id_fkey";

-- DropForeignKey
ALTER TABLE "yarn_mappings" DROP CONSTRAINT "yarn_mappings_yarn_type_id_fkey";

-- DropForeignKey
ALTER TABLE "yarns" DROP CONSTRAINT "yarns_blend_id_fkey";

-- DropForeignKey
ALTER TABLE "yarns" DROP CONSTRAINT "yarns_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "yarns" DROP CONSTRAINT "yarns_yarn_type_id_fkey";

-- AlterTable
ALTER TABLE "blends" ADD COLUMN     "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "shades" DROP COLUMN "brand_id",
DROP COLUMN "percentage",
ADD COLUMN     "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "brands";

-- DropTable
DROP TABLE "files";

-- DropTable
DROP TABLE "machines";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "production";

-- DropTable
DROP TABLE "suppliers";

-- DropTable
DROP TABLE "yarn_mappings";

-- DropTable
DROP TABLE "yarn_types";

-- DropTable
DROP TABLE "yarns";

-- CreateTable
CREATE TABLE "fibres" (
    "id" UUID NOT NULL,
    "fibre_name" TEXT NOT NULL,
    "fibre_code" TEXT NOT NULL,
    "stock_kg" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fibres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blend_fibres" (
    "id" UUID NOT NULL,
    "blend_id" UUID NOT NULL,
    "fibre_id" UUID NOT NULL,
    "percentage" INTEGER NOT NULL,

    CONSTRAINT "blend_fibres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blend_fibres_blend_id_fibre_id_key" ON "blend_fibres"("blend_id", "fibre_id");

-- AddForeignKey
ALTER TABLE "blend_fibres" ADD CONSTRAINT "blend_fibres_blend_id_fkey" FOREIGN KEY ("blend_id") REFERENCES "blends"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blend_fibres" ADD CONSTRAINT "blend_fibres_fibre_id_fkey" FOREIGN KEY ("fibre_id") REFERENCES "fibres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
