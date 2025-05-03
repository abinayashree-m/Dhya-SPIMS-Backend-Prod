-- AlterTable
ALTER TABLE "fibres" ADD COLUMN     "closing_stock" DECIMAL(10,2),
ADD COLUMN     "consumed_stock" DECIMAL(10,2),
ADD COLUMN     "inward_stock" DECIMAL(10,2),
ADD COLUMN     "outward_stock" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fibre_restock_requests" (
    "id" UUID NOT NULL,
    "fibre_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "requested_kg" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "expected_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fibre_restock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fibre_restock_requests_fibre_id_idx" ON "fibre_restock_requests"("fibre_id");

-- CreateIndex
CREATE INDEX "fibre_restock_requests_supplier_id_idx" ON "fibre_restock_requests"("supplier_id");

-- AddForeignKey
ALTER TABLE "fibre_restock_requests" ADD CONSTRAINT "fibre_restock_requests_fibre_id_fkey" FOREIGN KEY ("fibre_id") REFERENCES "fibres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fibre_restock_requests" ADD CONSTRAINT "fibre_restock_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
