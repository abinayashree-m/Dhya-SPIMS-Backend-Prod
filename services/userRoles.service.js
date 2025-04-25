const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createRole = async (tenantId, name, permissions) => {
  return prisma.roles.create({
    data: {
      tenant_id: tenantId,
      name,
      permissions,
    },
  });
};

exports.getRolesByTenant = async (tenantId) => {
  return prisma.roles.findMany({
    where: { tenant_id: tenantId },
  });
};

exports.updateRole = async (id, data) => {
  return prisma.roles.update({
    where: { id },
    data,
  });
};

exports.deleteRole = async (id) => {
  return prisma.roles.delete({
    where: { id },
  });
};