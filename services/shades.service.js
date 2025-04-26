const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create a new shade with multiple fibre compositions
async function createShade(data) {
  const { fibre_composition = [], ...rest } = data;

  const shade = await prisma.shades.create({
    data: { ...rest },
  });

  if (Array.isArray(fibre_composition) && fibre_composition.length > 0) {
    // 🛡️ Remove duplicate fibre_id before inserting
    const uniqueCompositions = [];
    const seenFibreIds = new Set();

    for (const f of fibre_composition) {
      if (!seenFibreIds.has(f.fibre_id)) {
        uniqueCompositions.push({
          shade_id: shade.id,
          fibre_id: f.fibre_id,
          percentage: new Prisma.Decimal(f.percentage),
        });
        seenFibreIds.add(f.fibre_id);
      }
    }

    await prisma.shade_fibres.createMany({
      data: uniqueCompositions,
      skipDuplicates: true, // optional extra safety
    });
  }

  return getShadeById(shade.id);
}

// ✅ Update a shade and replace its fibre composition
async function updateShade(id, data) {
  const { fibre_composition = [], ...rest } = data;

  const shade = await prisma.shades.update({
    where: { id },
    data: { ...rest },
  });

  if (Array.isArray(fibre_composition)) {
    await prisma.shade_fibres.deleteMany({ where: { shade_id: id } });

    // 🛡️ Remove duplicate fibre_id before inserting
    const uniqueCompositions = [];
    const seenFibreIds = new Set();

    for (const f of fibre_composition) {
      if (!seenFibreIds.has(f.fibre_id)) {
        uniqueCompositions.push({
          shade_id: id,
          fibre_id: f.fibre_id,
          percentage: new Prisma.Decimal(f.percentage),
        });
        seenFibreIds.add(f.fibre_id);
      }
    }

    await prisma.shade_fibres.createMany({
      data: uniqueCompositions,
      skipDuplicates: true,
    });
  }

  return getShadeById(id);
}

// ✅ Get all shades (optionally filtered by fibre)
async function getAllShades({ fibre_id } = {}) {
  return await prisma.shades.findMany({
    where: fibre_id ? { shade_fibres: { some: { fibre_id } } } : {},
    orderBy: { created_at: 'desc' },
    include: {
      shade_fibres: {
        include: {
          fibre: true,
        },
      },
    },
  });
}

// ✅ Get shade by ID
async function getShadeById(id) {
  return await prisma.shades.findUnique({
    where: { id },
    include: {
      shade_fibres: {
        include: {
          fibre: true,
        },
      },
    },
  });
}

// ✅ Delete shade and its composition
async function deleteShade(id) {
  await prisma.shade_fibres.deleteMany({ where: { shade_id: id } });
  return await prisma.shades.delete({ where: { id } });
}

// ✅ Optional: Shade stock summary
async function getShadeStockSummary() {
  return await prisma.shades.groupBy({
    by: ['id'],
    _sum: {
      available_stock_kg: true,
    },
    orderBy: {
      _sum: {
        available_stock_kg: 'desc',
      },
    },
  });
}

module.exports = {
  createShade,
  updateShade,
  getAllShades,
  getShadeById,
  deleteShade,
  getShadeStockSummary,
};