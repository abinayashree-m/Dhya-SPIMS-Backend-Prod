const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBuyersTenant() {
  try {
    console.log('🔍 Checking existing buyers...');
    
    // Get all existing buyers
    const existingBuyers = await prisma.buyer.findMany();
    console.log(`Found ${existingBuyers.length} existing buyers:`, existingBuyers);
    
    if (existingBuyers.length === 0) {
      console.log('✅ No existing buyers found. Safe to proceed with migration.');
      return;
    }
    
    // Get the first tenant (assuming there's at least one)
    const firstTenant = await prisma.tenant.findFirst();
    if (!firstTenant) {
      console.log('❌ No tenants found. Cannot assign buyers to tenant.');
      return;
    }
    
    console.log(`📋 Found tenant: ${firstTenant.name} (${firstTenant.id})`);
    
    // Ask user what to do
    console.log('\n🤔 Options:');
    console.log('1. Delete all existing buyers (if they are not important)');
    console.log('2. Assign all existing buyers to the first tenant');
    console.log('3. Exit without changes');
    
    // For now, let's assign them to the first tenant
    console.log('\n🔄 Assigning existing buyers to first tenant...');
    
    for (const buyer of existingBuyers) {
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: { tenantId: firstTenant.id }
      });
      console.log(`✅ Updated buyer "${buyer.name}" with tenant ID: ${firstTenant.id}`);
    }
    
    console.log('✅ All buyers have been assigned to tenant. Safe to proceed with migration.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBuyersTenant(); 