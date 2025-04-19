-- CreateTable
CREATE TABLE "fibre_usage_logs" (
    "id" UUID NOT NULL,
    "fibre_id" UUID NOT NULL,
    "used_kg" DECIMAL(10,2) NOT NULL,
    "used_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fibre_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fibre_usage_logs_fibre_id_idx" ON "fibre_usage_logs"("fibre_id");

-- AddForeignKey
ALTER TABLE "fibre_usage_logs" ADD CONSTRAINT "fibre_usage_logs_fibre_id_fkey" FOREIGN KEY ("fibre_id") REFERENCES "fibres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
