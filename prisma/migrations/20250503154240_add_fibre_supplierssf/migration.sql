-- CreateTable
CREATE TABLE "fibre_transfers" (
    "id" UUID NOT NULL,
    "fibre_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "sent_kg" DECIMAL(10,2) NOT NULL,
    "sent_date" TIMESTAMP(3) NOT NULL,
    "expected_return" TIMESTAMP(3),
    "returned_kg" DECIMAL(10,2),
    "return_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fibre_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fibre_transfers_fibre_id_idx" ON "fibre_transfers"("fibre_id");

-- CreateIndex
CREATE INDEX "fibre_transfers_supplier_id_idx" ON "fibre_transfers"("supplier_id");

-- AddForeignKey
ALTER TABLE "fibre_transfers" ADD CONSTRAINT "fibre_transfers_fibre_id_fkey" FOREIGN KEY ("fibre_id") REFERENCES "fibres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fibre_transfers" ADD CONSTRAINT "fibre_transfers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
