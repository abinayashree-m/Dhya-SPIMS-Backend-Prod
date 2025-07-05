const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

exports.assignRole = async (userId, roleId) => {
  return prisma.userRole.upsert({
    where: { 
      userId_roleId: {
        userId: userId,
        roleId: roleId
      }
    },
    update: {},
    create: { userId: userId, roleId: roleId },
  });
};

exports.getUserRole = async (userId) => {
  return prisma.userRole.findFirst({
    where: { userId: userId },
    include: { role: true },
  });
};