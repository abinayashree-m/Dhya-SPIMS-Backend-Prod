-- Migration script to update CompanyPersona table schema
-- This script will drop the existing table and recreate it with the new structure

-- Drop the existing table if it exists
DROP TABLE IF EXISTS "CompanyPersona" CASCADE;

-- Create the new table with structured fields
CREATE TABLE "CompanyPersona" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "targetMarketSweetSpot" TEXT NOT NULL,
    "swotAnalysis" JSONB NOT NULL,
    "detailedAnalysis" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "CompanyPersona_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on tenant_id
CREATE UNIQUE INDEX "CompanyPersona_tenant_id_key" ON "CompanyPersona"("tenant_id");

-- Add foreign key constraint
ALTER TABLE "CompanyPersona" ADD CONSTRAINT "CompanyPersona_tenant_id_fkey" 
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "CompanyPersona_tenant_id_idx" ON "CompanyPersona"("tenant_id");
CREATE INDEX "CompanyPersona_isActive_idx" ON "CompanyPersona"("isActive");

-- Insert a sample record for testing (optional)
-- INSERT INTO "CompanyPersona" (
--     "id", 
--     "tenant_id", 
--     "executiveSummary", 
--     "targetMarketSweetSpot", 
--     "swotAnalysis", 
--     "detailedAnalysis"
-- ) VALUES (
--     gen_random_uuid(),
--     '3bf6ce0f-f1dd-4cee-865b-e73552d7b25b', -- Replace with actual tenant ID
--     'Sample executive summary for testing',
--     'Sample target market sweet spot',
--     '{"strengths": ["Sample strength"], "weaknesses": ["Sample weakness"], "opportunities": ["Sample opportunity"], "threats": ["Sample threat"]}',
--     '{"productionCapabilities": "Sample production capabilities", "coreExpertise": "Sample core expertise", "marketPositioning": "Sample market positioning", "competitiveAdvantages": ["Sample advantage"], "marketChallenges": ["Sample challenge"], "growthStrategies": ["Sample strategy"]}'
-- );

COMMIT; 