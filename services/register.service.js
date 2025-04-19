const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function registerTenantWithAdmin({ tenantName, domain, adminName, email, password }) {
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    throw new Error('User already exists with this email');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const tenant = await prisma.tenants.create({
    data: {
      name: tenantName,
      domain,
      users: {
        create: {
          name: adminName,
          email,
          password_hash,
          role: 'admin',
        },
      },
    },
    include: {
      users: true,
    },
  });

  return tenant;
}

module.exports = {
  registerTenantWithAdmin,
};