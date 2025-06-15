const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const userService = {
  async createUser(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.users.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: hashedPassword,
        role: data.role,
        tenant_id: data.tenant_id,
        is_active: true
      }
    });
  },

  async getUserById(id) {
    return prisma.users.findUnique({
      where: { id },
      include: {
        user_roles: {
          include: {
            role: true
          }
        },
        user_settings: true
      }
    });
  },

  async updateUser(id, data) {
    const updateData = { ...data };
    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    return prisma.users.update({
      where: { id },
      data: updateData
    });
  },

  async deleteUser(id) {
    return prisma.users.delete({
      where: { id }
    });
  },

  async assignRole(userId, roleId) {
    return prisma.user_roles.create({
      data: {
        user_id: userId,
        role_id: roleId
      }
    });
  }
};

module.exports = userService;
