const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSuppliers() {
  try {
    console.log('🔍 Checking for suppliers in database...');
    
    // Find the Patagonia brand
    const patagoniaBrand = await prisma.discoveredBrand.findFirst({
      where: {
        companyName: {
          contains: 'Patagonia',
          mode: 'insensitive'
        }
      },
      include: {
        discoveredSuppliers: true
      }
    });
    
    if (!patagoniaBrand) {
      console.log('❌ Patagonia brand not found in database');
      return;
    }
    
    console.log('✅ Patagonia brand found:', {
      id: patagoniaBrand.id,
      name: patagoniaBrand.companyName,
      status: patagoniaBrand.status,
      suppliersCount: patagoniaBrand.discoveredSuppliers?.length || 0
    });
    
    if (patagoniaBrand.discoveredSuppliers?.length > 0) {
      console.log('✅ Suppliers found:');
      patagoniaBrand.discoveredSuppliers.forEach((supplier, index) => {
        console.log(`  ${index + 1}. ${supplier.companyName} (${supplier.country}) - ${supplier.relevanceScore}% relevance`);
      });
    } else {
      console.log('❌ No suppliers found - n8n workflow may not have completed yet');
    }
    
    // Check all brands with suppliers
    const allBrandsWithSuppliers = await prisma.discoveredBrand.findMany({
      where: {
        discoveredSuppliers: {
          some: {}
        }
      },
      include: {
        discoveredSuppliers: true
      }
    });
    
    console.log(`\n📊 Total brands with suppliers: ${allBrandsWithSuppliers.length}`);
    allBrandsWithSuppliers.forEach(brand => {
      console.log(`  - ${brand.companyName}: ${brand.discoveredSuppliers.length} suppliers`);
    });
    
  } catch (error) {
    console.error('❌ Error checking suppliers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuppliers(); 