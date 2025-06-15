const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tenantService = {
  async createTenant(data) {
    return prisma.tenants.create({
      data: {
        name: data.name,
        domain: data.domain,
        plan: data.plan || 'free',
        is_active: true
      }
    });
  },

  async getTenantById(id) {
    return prisma.tenants.findUnique({
      where: { id },
      include: {
        settings: true,
        users: true
      }
    });
  },

  async updateTenant(id, data) {
    return prisma.tenants.update({
      where: { id },
      data: {
        name: data.name,
        domain: data.domain,
        plan: data.plan,
        is_active: data.is_active
      }
    });
  },

  async deleteTenant(id) {
    return prisma.tenants.delete({
      where: { id }
    });
  }
};

module.exports = tenantService;
