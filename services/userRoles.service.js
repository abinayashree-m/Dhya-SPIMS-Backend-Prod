const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createRole = async (tenantId, name, permissions) => {
  return prisma.role.create({
    data: {
      tenantId: tenantId,
      name,
    },
  });
};

exports.getRolesByTenant = async (tenantId) => {
  return prisma.role.findMany({
    where: { tenantId: tenantId },
  });
};

exports.updateRole = async (id, data) => {
  return prisma.role.update({
    where: { id },
    data,
  });
};

exports.deleteRole = async (id) => {
  return prisma.role.delete({
    where: { id },
  });
};