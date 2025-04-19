-- CreateTable
CREATE TABLE "productions" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "section" TEXT NOT NULL,
    "machine" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "count" TEXT,
    "hank" DECIMAL(6,2),
    "production_kg" DECIMAL(10,2) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productions_pkey" PRIMARY KEY ("id")
);
