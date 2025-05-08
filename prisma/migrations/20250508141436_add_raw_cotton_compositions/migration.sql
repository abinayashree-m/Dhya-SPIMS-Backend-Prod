-- CreateTable
CREATE TABLE "raw_cotton_compositions" (
    "id" TEXT NOT NULL,
    "shade_id" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_cotton_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_cotton_compositions_shade_id_key" ON "raw_cotton_compositions"("shade_id");

-- AddForeignKey
ALTER TABLE "raw_cotton_compositions" ADD CONSTRAINT "raw_cotton_compositions_shade_id_fkey" FOREIGN KEY ("shade_id") REFERENCES "shades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
