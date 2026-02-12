const { PrismaClient } = require('@prisma/client');

// ✅ Enhanced Prisma Client with connection management
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// ✅ Connection retry logic
async function connectWithRetry(maxRetries = 5, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 [DATABASE] Connection attempt ${attempt}/${maxRetries}...`);
      await prisma.$connect();
      console.log('✅ [DATABASE] Database connected successfully');
      
      // Test the connection
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ [DATABASE] Database connection test passed');
      return true;
      
    } catch (error) {
      console.error(`❌ [DATABASE] Connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('❌ [DATABASE] All connection attempts failed');
        throw error;
      }
      
      console.log(`⏳ [DATABASE] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ✅ Graceful shutdown
async function disconnect() {
  try {
    await prisma.$disconnect();
    console.log('✅ [DATABASE] Database disconnected gracefully');
  } catch (error) {
    console.error('❌ [DATABASE] Error during disconnect:', error);
  }
}

// ✅ Health check
async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
}

// Handle process termination
process.on('SIGTERM', disconnect);
process.on('SIGINT', disconnect);

module.exports = {
  prisma,
  connectWithRetry,
  disconnect,
  healthCheck
}; 