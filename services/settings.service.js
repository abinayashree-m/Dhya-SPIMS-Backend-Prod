const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getTenantSettings = async (tenantId) => {
  return prisma.settings.findUnique({
    where: { tenant_id: tenantId },
  });
};

exports.updateTenantSettings = async (tenantId, data) => {
  return prisma.settings.upsert({
    where: { tenant_id: tenantId },
    update: data,
    create: { tenant_id: tenantId, ...data },
  });
};