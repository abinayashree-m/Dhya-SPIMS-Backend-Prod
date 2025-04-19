-- CreateTable
CREATE TABLE "blends" (
    "id" UUID NOT NULL,
    "blend_code" TEXT,
    "description" TEXT,

    CONSTRAINT "blends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "file_url" TEXT,
    "file_type" TEXT,
    "linked_yarn_id" UUID,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "section" TEXT,
    "machine_code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "order_number" TEXT,
    "buyer_name" TEXT,
    "yarn_id" UUID,
    "quantity_kg" INTEGER,
    "delivery_date" DATE,
    "status" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "date" DATE NOT NULL,
    "section" TEXT,
    "shift" TEXT,
    "value" DECIMAL(10,2),
    "linked_order_id" UUID,
    "entered_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shades" (
    "id" UUID NOT NULL,
    "shade_code" TEXT,
    "brand_id" UUID,
    "blend_id" UUID,
    "shade_name" TEXT,
    "percentage" TEXT,
    "available_stock_kg" DECIMAL(10,2),

    CONSTRAINT "shades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "plan_type" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "address" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "plan" TEXT DEFAULT 'free',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yarn_mappings" (
    "id" UUID NOT NULL,
    "count" TEXT,
    "brand_id" UUID,
    "blend_id" UUID,
    "shade_id" UUID,
    "yarn_type_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yarn_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yarn_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yarn_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yarns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "yarn_type_id" UUID,
    "blend_id" UUID,
    "count_range" TEXT,
    "base_shade" TEXT,
    "special_effect" TEXT,
    "status" TEXT DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yarns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_linked_yarn_id_fkey" FOREIGN KEY ("linked_yarn_id") REFERENCES "yarns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_yarn_id_fkey" FOREIGN KEY ("yarn_id") REFERENCES "yarns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production" ADD CONSTRAINT "production_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production" ADD CONSTRAINT "production_linked_order_id_fkey" FOREIGN KEY ("linked_order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production" ADD CONSTRAINT "production_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shades" ADD CONSTRAINT "shades_blend_id_fkey" FOREIGN KEY ("blend_id") REFERENCES "blends"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shades" ADD CONSTRAINT "shades_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yarn_mappings" ADD CONSTRAINT "yarn_mappings_blend_id_fkey" FOREIGN KEY ("blend_id") REFERENCES "blends"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yarn_mappings" ADD CONSTRAINT "yarn_mappings_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yarn_mappings" ADD CONSTRAINT "yarn_mappings_shade_id_fkey" FOREIGN KEY ("shade_id") REFERENCES "shades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yarn_mappings" ADD CONSTRAINT "yarn_mappings_yarn_type_id_fkey" FOREIGN KEY ("yarn_type_id") REFERENCES "yarn_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_blend_id_fkey" FOREIGN KEY ("blend_id") REFERENCES "blends"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_yarn_type_id_fkey" FOREIGN KEY ("yarn_type_id") REFERENCES "yarn_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
