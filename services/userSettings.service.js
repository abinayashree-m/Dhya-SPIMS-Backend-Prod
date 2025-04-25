const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getUserSettings = async (userId) => {
  return prisma.user_settings.findUnique({
    where: { user_id: userId },
  });
};

exports.updateUserSettings = async (userId, data) => {
  return prisma.user_settings.upsert({
    where: { user_id: userId },
    update: data,
    create: { user_id: userId, ...data },
  });
};