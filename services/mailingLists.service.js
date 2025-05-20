const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createMailingListService = async (name, buyerIds = [], recipients = []) => {
  // Choose path based on input
  if (recipients.length > 0) {
    // 🎯 Create using Potential Buyers
    return await prisma.mailingList.create({
      data: {
        name,
        mailingListRecipients: {
          create: recipients.map((r) => ({
            name: r.name,
            email: r.email,
            company: r.company,
            source: r.source || 'potential',
          }))
        }
      },
      include: {
        mailingListRecipients: true
      }
    });
  }

  // ✅ Create using Buyers
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
          buyer: true
        }
      },
      mailingListRecipients: true
    }
  });
};

exports.deleteMailingListService = async (id) => {
  return await prisma.mailingList.delete({
    where: { id },
  });
};

exports.updateMailingListService = async (id, name, buyerIds = [], recipients = []) => {
  if (recipients.length > 0) {
    return await prisma.mailingList.update({
      where: { id },
      data: {
        name,
        mailingListBuyers: {
          deleteMany: {}
        },
        mailingListRecipients: {
          deleteMany: {},
          create: recipients.map((r) => ({
            name: r.name,
            email: r.email,
            company: r.company,
            source: r.source || 'potential',
          }))
        }
      },
      include: {
        mailingListRecipients: true
      }
    });
  }

  return await prisma.mailingList.update({
    where: { id },
    data: {
      name,
      mailingListRecipients: {
        deleteMany: {}
      },
      mailingListBuyers: {
        deleteMany: {},
        create: buyerIds.map((buyerId) => ({
          buyer: { connect: { id: buyerId } }
        }))
      }
    },
    include: {
      mailingListBuyers: {
        include: { buyer: true }
      }
    }
  });
};