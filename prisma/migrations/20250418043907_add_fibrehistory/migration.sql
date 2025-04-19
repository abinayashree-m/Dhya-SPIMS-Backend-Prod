-- CreateTable
CREATE TABLE "fiber_usage_history" (
    "id" UUID NOT NULL,
    "fibre_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "usedKg" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "fiber_usage_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fiber_usage_history" ADD CONSTRAINT "fiber_usage_history_fibre_id_fkey" FOREIGN KEY ("fibre_id") REFERENCES "fibres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
