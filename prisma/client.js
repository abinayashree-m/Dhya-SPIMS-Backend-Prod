const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  __internal: {
    engine: {
      connectionLimit: 10,
      poolTimeout: 30,
      acquireTimeout: 30
    }
  }
});

// Handle connection errors
prisma.$on('query', (e) => {
  // Logging removed
});

prisma.$on('error', (e) => {
  // Logging removed
});

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma; 