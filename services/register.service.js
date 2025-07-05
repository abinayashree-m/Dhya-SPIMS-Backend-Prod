//pullable request
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function registerTenantWithAdmin({ tenantName, domain, adminName, email, password, roles = [] }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('User already exists with this email');

  const passwordHash = await bcrypt.hash(password, 10);

  return await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: tenantName, domain }
    });

    const createdRoles = await Promise.all(
      roles.map(role =>
        tx.role.create({
          data: {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            tenantId: tenant.id,
          },
        })
      )
    );

    const adminUser = await tx.user.create({
      data: {
        name: adminName,
        email,
        passwordHash,
        tenantId: tenant.id,
        role: 'admin',
      },
    });

    await Promise.all(
      createdRoles.map(role =>
        tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: role.id,
          },
        })
      )
    );

    return {
      tenantId: tenant.id,
      adminUserId: adminUser.id,
      roles: createdRoles,
    };
  });
}

module.exports = {
  registerTenantWithAdmin,
};
