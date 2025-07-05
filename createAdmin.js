// createAdmin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@nscspinning.com';
  const tenantId = '3bf9bed5-d468-47c5-9c19-61a7e37faedc';

  // Step 1: Ensure tenant exists
  let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  
  if (!tenant) {
    console.log('🏢 Creating tenant...');
    tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'NSC Spinning',
        domain: 'nscspinning.com',
        plan: 'premium',
        isActive: true,
      },
    });
    console.log('✅ Tenant created:', tenant.name);
  } else {
    console.log('🏢 Tenant already exists:', tenant.name);
  }

  // Step 2: Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`🧹 Cleaning up existing user with ID: ${existing.id}`);

    // Remove foreign key references first
    // Note: Removed files reference as it doesn't exist in current schema
    // Delete Production records since createdBy is required (not nullable)
    await prisma.production.deleteMany({ where: { createdBy: existing.id } });
    // Update PurchaseOrder records since createdBy is nullable
    await prisma.purchaseOrder.updateMany({ where: { createdBy: existing.id }, data: { createdBy: null } });

    // Delete the user
    await prisma.user.delete({ where: { id: existing.id } });

    console.log(`✅ Deleted existing user: ${email}`);
  }

  // Step 3: Create the new admin user
  const hashedPassword = await bcrypt.hash('admin@123', 10);

  const newUser = await prisma.user.create({
    data: {
      name: 'Chetan',
      email,
      passwordHash: hashedPassword,
      role: 'admin',
      tenantId: tenantId,
      isActive: true,
    },
  });

  console.log('🎉 New admin user created:', newUser);
}

createAdmin()
  .catch((err) => {
    console.error('❌ Error creating admin user:', err);
  })
  .finally(() => {
    prisma.$disconnect();
  });