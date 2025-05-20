const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = () => {
  return prisma.potentialBuyer.findMany({
    orderBy: { company: 'asc' },
  });
};

exports.bulkUpload = async (buyers) => {
  const formatted = buyers.map((b) => ({
    company: b.company,
    person: b.person,
    email: b.email,
    phone: b.phone || null,
    notes: b.notes || null,
  }));

  return await prisma.potentialBuyer.createMany({
    data: formatted,
    skipDuplicates: true, // ✅ avoids email duplication if constraint exists
  });
};