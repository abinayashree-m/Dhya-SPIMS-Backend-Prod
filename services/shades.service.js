const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create a new shade with multiple fibre compositions
async function createShade(data) {
  const { fibre_composition = [], raw_cotton_composition = [], ...rest } = data;
  const fibreTotal = fibre_composition.reduce((sum, f) => sum + Number(f.percentage), 0);
  const rawTotal = raw_cotton_composition.reduce((sum, r) => sum + Number(r.percentage), 0);
  const totalPercentage = fibreTotal + rawTotal;
  
  if (totalPercentage !== 100) {
    return res.status(400).json({
      error: `Invalid % sum: ${totalPercentage}. Combined fibre + raw_cotton must equal 100.`,
    });
  }
  const shade = await prisma.shades.create({ data: { ...rest } });

  // Fiber compositions
  if (fibre_composition.length > 0) {
    const entries = fibre_composition
      .filter(f => f.fibre_id && !isNaN(f.percentage))
      .map(f => ({
        shade_id: shade.id,
        fibre_id: f.fibre_id,
        percentage: new Prisma.Decimal(f.percentage),
      }));
    await prisma.shade_fibres.createMany({ data: entries, skipDuplicates: true });
  }

  // Raw cotton entries
  if (raw_cotton_composition.length > 0) {
    for (const r of raw_cotton_composition) {
      await prisma.raw_cotton_composition.create({
        data: {
          shade_id: shade.id,
          lot_number: r.lot_number || 'default',
          percentage: r.percentage,
          grade: r.grade || null,
          source: r.source || null,
          notes: r.notes || null,
        },
      });
    }
  }

  return getShadeById(shade.id);
}

// ✅ Update a shade and replace its fibre composition
async function updateShade(id, data) {
  const {
    fibre_composition = [],
    raw_cotton_composition = [], // may come as object instead of array
    ...rest
  } = data;

  const rawCottonArray = Array.isArray(raw_cotton_composition)
    ? raw_cotton_composition
    : raw_cotton_composition
    ? [raw_cotton_composition]
    : [];

  // Update base shade
  await prisma.shades.update({
    where: { id },
    data: { ...rest },
  });

  // Replace fibre compositions
  await prisma.shade_fibres.deleteMany({ where: { shade_id: id } });

  const fibreData = fibre_composition
    .filter(f => f.fibre_id && !isNaN(f.percentage))
    .map(f => ({
      shade_id: id,
      fibre_id: f.fibre_id,
      percentage: new Prisma.Decimal(f.percentage),
    }));
  await prisma.shade_fibres.createMany({ data: fibreData, skipDuplicates: true });

  // Update raw cotton entries
  const lotNumbers = rawCottonArray.map(r => r.lot_number || 'default');

  // 1. Delete removed lots
  await prisma.raw_cotton_composition.deleteMany({
    where: {
      shade_id: id,
      NOT: { lot_number: { in: lotNumbers } },
    },
  });

  // 2. Upsert all current lots
  for (const r of rawCottonArray) {
    const lot = r.lot_number || 'default';
    await prisma.raw_cotton_composition.upsert({
      where: {
        shade_id_lot_number: {
          shade_id: id,
          lot_number: lot,
        },
      },
      update: {
        percentage: r.percentage,
        grade: r.grade ?? null,
        source: r.source ?? null,
        notes: r.notes ?? null,
      },
      create: {
        shade_id: id,
        lot_number: lot,
        percentage: r.percentage,
        grade: r.grade ?? null,
        source: r.source ?? null,
        notes: r.notes ?? null,
      },
    });
  }

  return getShadeById(id);
}

// ✅ Get all shades (optionally filtered by fibre)
// ✅ Get all shades (service)
async function getAllShades({ fibre_id } = {}) {
  const raw = await prisma.shades.findMany({
    where: fibre_id ? { shade_fibres: { some: { fibre_id } } } : {},
    orderBy: { created_at: 'desc' },
    include: {
      shade_fibres: { include: { fibre: true } },
      raw_cotton_composition: true,
    },
  });

  return raw.map(shade => ({
    ...shade,
    blend_composition: shade.shade_fibres,
    raw_cotton_composition: shade.raw_cotton_composition,
  }));
}

// ✅ Get shade by ID
async function getShadeById(id) {
  const shade = await prisma.shades.findUnique({
    where: { id },
    include: {
      shade_fibres: { include: { fibre: true } },
      raw_cotton_composition: true,
    },
  });

  return {
    ...shade,
    blend_composition: shade.shade_fibres,
    raw_cotton_composition: shade.raw_cotton_composition,
  };
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