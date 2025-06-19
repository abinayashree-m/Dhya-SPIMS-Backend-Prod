//pullable request
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function registerTenantWithAdmin({ tenantName, domain, adminName, email, password, roles = [] }) {
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) throw new Error('User already exists with this email');

  const password_hash = await bcrypt.hash(password, 10);

  return await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenants.create({
      data: { name: tenantName, domain }
    });

    const createdRoles = await Promise.all(
      roles.map(role =>
        tx.roles.create({
          data: {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            tenant_id: tenant.id,
          },
        })
      )
    );

    const adminUser = await tx.users.create({
      data: {
        name: adminName,
        email,
        password_hash,
        tenant_id: tenant.id,
        role: 'admin',
      },
    });

    await Promise.all(
      createdRoles.map(role =>
        tx.user_roles.create({
          data: {
            user_id: adminUser.id,
            role_id: role.id,
          },
        })
      )
    );

    return {
      tenant_id: tenant.id,
      admin_user_id: adminUser.id,
      roles: createdRoles,
    };
  });
}

module.exports = {
  registerTenantWithAdmin,
};
