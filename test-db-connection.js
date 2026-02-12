const { prisma, connectWithRetry, healthCheck } = require('./prisma/client');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 [TEST] Testing database connection...');
  console.log('🔍 [TEST] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  try {
    // Test connection with retry
    await connectWithRetry();
    
    // Test health check
    const health = await healthCheck();
    console.log('✅ [TEST] Health check result:', health);
    
    // Test a simple query
    console.log('🔍 [TEST] Testing simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ [TEST] Query result:', result);
    
    // Test mailing lists query (the one that was failing)
    console.log('🔍 [TEST] Testing mailing lists query...');
    const lists = await prisma.mailingList.findMany({
      include: {
        mailingListBuyers: {
          include: {
            buyer: true
          }
        }
      }
    });
    console.log(`✅ [TEST] Mailing lists query successful. Found ${lists.length} lists`);
    
    // Test buyers query (the one that was failing)
    console.log('🔍 [TEST] Testing buyers query...');
    const buyers = await prisma.buyer.findMany();
    console.log(`✅ [TEST] Buyers query successful. Found ${buyers.length} buyers`);
    
    console.log('🎉 [TEST] All tests passed! Database connection is working properly.');
    
  } catch (error) {
    console.error('❌ [TEST] Connection test failed:', error);
    console.error('❌ [TEST] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
    console.log('🔌 [TEST] Database disconnected');
  }
}

testConnection()
  .then(() => {
    console.log('✅ [TEST] Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [TEST] Test failed:', error);
    process.exit(1);
  }); 