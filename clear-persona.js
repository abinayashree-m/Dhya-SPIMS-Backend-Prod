const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearPersonaData() {
  console.log('🗑️ Starting persona data cleanup...');
  
  try {
    // Count existing personas
    const countBefore = await prisma.companyPersona.count();
    console.log(`📊 Found ${countBefore} existing persona records`);
    
    if (countBefore === 0) {
      console.log('ℹ️ No persona records found to delete');
      return;
    }
    
    // Delete all persona records
    console.log('🗑️ Deleting all persona records...');
    const result = await prisma.companyPersona.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} persona records`);
    
    // Verify deletion
    const countAfter = await prisma.companyPersona.count();
    console.log(`📊 Remaining persona records: ${countAfter}`);
    
    if (countAfter === 0) {
      console.log('✅ All persona data cleared successfully!');
    } else {
      console.log('⚠️ Some persona records may still exist');
    }
    
  } catch (error) {
    console.error('❌ Error clearing persona data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  clearPersonaData()
    .then(() => {
      console.log('🎉 Persona cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Persona cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { clearPersonaData }; 