const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllEmailTemplates = async () => {
  return await prisma.emailTemplate.findMany();
};

exports.getEmailTemplateById = async (id) => {
  return await prisma.emailTemplate.findUnique({ where: { id } });
};

exports.createEmailTemplate = async (data) => {
  return await prisma.emailTemplate.create({ data });
};

exports.updateEmailTemplate = async (id, data) => {
  return await prisma.emailTemplate.update({ where: { id }, data });
};

exports.deleteEmailTemplate = async (id) => {
  return await prisma.emailTemplate.delete({ where: { id } });
};