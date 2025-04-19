const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create Blend
async function createBlend({ blend_code, description }) {
  return await prisma.blends.create({
    data: {
      blend_code,
      description,
    },
  });
}

// ✅ Get All Blends with fibres and related shades
async function getAllBlends() {
  return await prisma.blends.findMany({
    include: {
      blend_fibres: {
        include: {
          fibres: true,
        },
      },
      shade_blends: {
        include: {
          shade: true,
        },
      },
    },
  });
}

// ✅ Get Blend by ID with fibre and shade composition
async function getBlendById(id) {
  return await prisma.blends.findUnique({
    where: { id },
    include: {
      blend_fibres: {
        include: {
          fibres: true,
        },
      },
      shade_blends: {
        include: {
          shade: true,
        },
      },
    },
  });
}

// ✅ Update Blend
async function updateBlend(id, data) {
  return await prisma.blends.update({
    where: { id },
    data,
  });
}

// ✅ Delete Blend
async function deleteBlend(id) {
  return await prisma.blends.delete({
    where: { id },
  });
}

// ✅ Blend Summary with calculated stock
async function getBlendSummary() {
  const blends = await prisma.blends.findMany({
    include: {
      blend_fibres: {
        include: {
          fibres: true,
        },
      },
    },
  });

  return blends.map((blend) => {
    const fibres = blend.blend_fibres
      .map((bf) => ({
        fibre_name: bf.fibres.fibre_name,
        fibre_code: bf.fibres.fibre_code,
        percentage: bf.percentage,
        stock_kg: bf.fibres.stock_kg.toNumber(),
      }))
      .sort((a, b) => b.percentage - a.percentage); // DESC by percentage

    const total_percentage = fibres.reduce((sum, f) => sum + f.percentage, 0);
    const isValid = total_percentage === 100;

    const possibleStocks = fibres.map((f) => (f.stock_kg * 100) / f.percentage);
    const total_stock_kg = Math.round(Math.min(...possibleStocks) * 100) / 100;

    return {
      blend_id: blend.id,
      blend_code: blend.blend_code,
      description: blend.description,
      total_percentage,
      is_valid: isValid,
      total_stock_kg,
      fibres,
    };
  });
}

// ✅ Fibre Usage Summary
async function getFibreUsageSummary() {
  const blendFibres = await prisma.blend_fibres.findMany({
    include: {
      fibres: true,
    },
  });

  const usageMap = {};

  for (const bf of blendFibres) {
    const fibreKey = `${bf.fibres.fibre_name} (${bf.fibres.fibre_code})`;

    const stock_kg = bf.fibres.stock_kg.toNumber();
    const used_kg = Math.round((stock_kg * bf.percentage) / 100 * 100) / 100;

    if (!usageMap[fibreKey]) {
      usageMap[fibreKey] = {
        fibre_name: bf.fibres.fibre_name,
        fibre_code: bf.fibres.fibre_code,
        total_stock: stock_kg,
        used_kg: 0,
      };
    }

    usageMap[fibreKey].used_kg += used_kg;
  }

  return Object.values(usageMap).sort((a, b) => b.used_kg - a.used_kg);
}

module.exports = {
  createBlend,
  getAllBlends,
  getBlendById,
  updateBlend,
  deleteBlend,
  getBlendSummary,
  getFibreUsageSummary,
};