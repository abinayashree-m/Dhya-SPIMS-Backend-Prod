-- CreateTable
CREATE TABLE "production_logs" (
    "id" UUID NOT NULL,
    "production_id" UUID NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shift" TEXT NOT NULL,
    "machine" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "operator" TEXT,
    "production_kg" DECIMAL(10,2) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
