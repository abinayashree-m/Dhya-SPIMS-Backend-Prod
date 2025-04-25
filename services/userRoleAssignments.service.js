const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

exports.assignRole = async (userId, roleId) => {
  return prisma.user_roles.upsert({
    where: { user_id: userId },
    update: { role_id: roleId },
    create: { user_id: userId, role_id: roleId },
  });
};

exports.getUserRole = async (userId) => {
  return prisma.user_roles.findUnique({
    where: { user_id: userId },
    include: { role: true },
  });
};