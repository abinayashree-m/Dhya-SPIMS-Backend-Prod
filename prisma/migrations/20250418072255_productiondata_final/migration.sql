/*
  Warnings:

  - Added the required column `order_id` to the `productions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `required_qty` to the `productions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `productions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `productions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "productions" ADD COLUMN     "order_id" UUID NOT NULL,
ADD COLUMN     "required_qty" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "productions" ADD CONSTRAINT "productions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productions" ADD CONSTRAINT "productions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productions" ADD CONSTRAINT "productions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
