const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBuyers() {
  try {
    const buyers = await prisma.buyer.findMany();
    console.log('Existing buyers:', buyers);
    
    const tenants = await prisma.tenant.findMany();
    console.log('Available tenants:', tenants);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBuyers(); 