const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createMailingListService = async (name, buyerIds) => {
    return await prisma.mailingList.create({
      data: {
        name,
        mailingListBuyers: {
          create: buyerIds.map((buyerId) => ({
            buyer: {
              connect: { id: buyerId }
            }
          }))
        }
      },
      include: {
        mailingListBuyers: {
          include: {
            buyer: true
          }
        }
      }
    });
  };

exports.getMailingListsService = async () => {
    return await prisma.mailingList.findMany({
      include: {
        mailingListBuyers: {
          include: {
            buyer: true // ✅ this works because MailingListBuyer has a relation to `buyer`
          }
        }
      }
    });
  };
exports.deleteMailingListService = async (id) => {
  return await prisma.mailingList.delete({
    where: { id },
  });
};

exports.updateMailingListService = async (id, name, buyerIds) => {
    return await prisma.mailingList.update({
      where: { id },
      data: {
        name,
        mailingListBuyers: {
          deleteMany: {}, // 🧹 remove all existing links
          create: buyerIds.map((buyerId) => ({
            buyer: { connect: { id: buyerId } }
          }))
        }
      },
      include: {
        mailingListBuyers: { include: { buyer: true } }
      }
    });
  };