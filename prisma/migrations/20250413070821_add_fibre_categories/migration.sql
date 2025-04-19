-- AlterTable
ALTER TABLE "fibres" ADD COLUMN     "category_id" UUID;

-- CreateTable
CREATE TABLE "fibre_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fibre_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fibre_categories_name_key" ON "fibre_categories"("name");

-- AddForeignKey
ALTER TABLE "fibres" ADD CONSTRAINT "fibres_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fibre_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
