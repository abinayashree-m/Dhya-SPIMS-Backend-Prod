const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignBuyerToTenant() {
  try {
    console.log('🔍 Checking existing buyers and tenants...');
    
    // Use raw SQL to get buyers (since tenantId column doesn't exist yet)
    const existingBuyers = await prisma.$queryRaw`SELECT * FROM buyers`;
    console.log(`Found ${existingBuyers.length} existing buyers:`, existingBuyers);
    
    if (existingBuyers.length === 0) {
      console.log('✅ No existing buyers found. Safe to proceed with migration.');
      return;
    }
    
    // Get the first tenant
    const tenants = await prisma.tenant.findMany();
    if (tenants.length === 0) {
      console.log('❌ No tenants found. Cannot assign buyers to tenant.');
      return;
    }
    
    const firstTenant = tenants[0];
    console.log(`📋 Found tenant: ${firstTenant.name} (${firstTenant.id})`);
    
    // Update existing buyers with tenant ID
    console.log('\n🔄 Updating existing buyers with tenant ID...');
    
    // Check if foreign key constraint exists, if not add it
    try {
      await prisma.$executeRaw`ALTER TABLE buyers ADD CONSTRAINT "buyers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE`;
      console.log('✅ Added foreign key constraint');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Foreign key constraint already exists');
      } else {
        throw error;
      }
    }
    
    // Update existing buyers with tenant ID
    for (const buyer of existingBuyers) {
      await prisma.$executeRaw`UPDATE buyers SET "tenantId" = ${firstTenant.id}::uuid WHERE id = ${buyer.id}::uuid`;
      console.log(`✅ Updated buyer "${buyer.name}" with tenant ID: ${firstTenant.id}`);
    }
    
    // Make tenantId required
    await prisma.$executeRaw`ALTER TABLE buyers ALTER COLUMN "tenantId" SET NOT NULL`;
    console.log('✅ Made tenantId required');
    
    console.log('✅ All buyers have been assigned to tenant. Schema is now ready!');
    console.log('🚀 You can now restart your backend server.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignBuyerToTenant(); 