-- AlterTable (Manual Fix)
ALTER TABLE "orders" ADD COLUMN "tenant_id" UUID;

-- Populate old rows (replace this with actual tenant ID)
UPDATE "orders" SET "tenant_id" = 'd3564cc1-9532-48c3-bc96-e26ff7cbd8ee';

-- Enforce NOT NULL
ALTER TABLE "orders" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Foreign Key Constraint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;