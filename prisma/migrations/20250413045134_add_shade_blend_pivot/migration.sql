-- CreateTable
CREATE TABLE "shade_blends" (
    "id" UUID NOT NULL,
    "shade_id" UUID NOT NULL,
    "blend_id" UUID NOT NULL,
    "percentage" INTEGER NOT NULL,

    CONSTRAINT "shade_blends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shade_blends_shade_id_blend_id_key" ON "shade_blends"("shade_id", "blend_id");

-- AddForeignKey
ALTER TABLE "shade_blends" ADD CONSTRAINT "shade_blends_shade_id_fkey" FOREIGN KEY ("shade_id") REFERENCES "shades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shade_blends" ADD CONSTRAINT "shade_blends_blend_id_fkey" FOREIGN KEY ("blend_id") REFERENCES "blends"("id") ON DELETE CASCADE ON UPDATE CASCADE;
