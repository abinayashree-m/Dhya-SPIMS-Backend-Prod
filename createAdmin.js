// createAdmin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@nscspinning.com';

  // Step 1: Check if user exists
  const existing = await prisma.users.findUnique({ where: { email } });

  if (existing) {
    console.log(`🧹 Cleaning up existing user with ID: ${existing.id}`);

    // Remove foreign key references first
    await prisma.files.deleteMany({ where: { uploaded_by: existing.id } });
    await prisma.production.updateMany({ where: { entered_by: existing.id }, data: { entered_by: null } });
    await prisma.orders.updateMany({ where: { created_by: existing.id }, data: { created_by: null } });

    // Delete the user
    await prisma.users.delete({ where: { id: existing.id } });

    console.log(`✅ Deleted existing user: ${email}`);
  }

  // Step 2: Create the new admin user
  const hashedPassword = await bcrypt.hash('admin@123', 10);

  const newUser = await prisma.users.create({
    data: {
      name: 'Dharsan Kumar',
      email,
      password_hash: hashedPassword,
      role: 'admin',
      tenant_id: '3bf9bed5-d468-47c5-9c19-61a7e37faedc',
      is_active: true,
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