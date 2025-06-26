const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = () => {
  return prisma.potentialBuyer.findMany({
    orderBy: { company: 'asc' },
  });
};

exports.bulkUpload = async (buyers) => {
  console.log(`[PotentialBuyer] bulkUpload called. Incoming rows: ${buyers?.length || 0}`);
  // Perform insert-or-update (upsert) based on unique email
  const formatted = buyers.map((b) => ({
    // Normalise/trim email to avoid uniqueness conflicts due to casing
    email: (b.email || '').trim().toLowerCase(),
    company: b.company,
    person: b.person,
    phone: b.phone || null,
    notes: b.notes || null,
  }));

  console.log('[PotentialBuyer] Normalised input sample (first 3 rows):', formatted.slice(0, 3));

  // Grab starting DB count for diagnostic purposes
  const startCount = await prisma.potentialBuyer.count();

  const batchSize = 500;
  let totalProcessed = 0;

  for (let i = 0; i < formatted.length; i += batchSize) {
    const batch = formatted.slice(i, i + batchSize);
    const ops = batch.map((data) =>
      prisma.potentialBuyer.upsert({
        where: { email: data.email },
        create: data,
        update: {
          company: data.company,
          person: data.person,
          phone: data.phone,
          notes: data.notes,
        },
      })
    );

    await prisma.$transaction(ops);
    totalProcessed += batch.length;
    console.log(`[PotentialBuyer] Batch processed (${totalProcessed}/${formatted.length})`);
  }

  const endCount = await prisma.potentialBuyer.count();
  const inserted = endCount - startCount;

  console.log(`[PotentialBuyer] Upsert completed. Total processed: ${totalProcessed}. New rows inserted: ${inserted}. Total rows in DB: ${endCount}`);

  return { processed: totalProcessed, inserted, total: endCount };
};