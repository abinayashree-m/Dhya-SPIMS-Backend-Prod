const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteBuyer() {
  try {
    console.log('🗑️ Deleting existing buyer...');
    
    const result = await prisma.buyer.deleteMany({});
    console.log(`✅ Deleted ${result.count} buyer(s)`);
    
    console.log('✅ Now you can run: npx prisma db push');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBuyer(); 