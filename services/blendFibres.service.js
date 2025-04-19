const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create a new blend-fibre mapping with percentage check
async function createBlendFibre({ blend_id, fibre_id, percentage }) {
  // Check for duplicates
  const existing = await prisma.blend_fibres.findUnique({
    where: {
      blend_id_fibre_id: {
        blend_id,
        fibre_id,
      },
    },
  });

  if (existing) {
    throw new Error('Fibre already exists in this blend.');
  }

  // Check total percentage
  const existingFibres = await prisma.blend_fibres.findMany({
    where: { blend_id },
    select: { percentage: true },
  });

  const totalPercentage = existingFibres.reduce(
    (sum, fibre) => sum + fibre.percentage,
    0
  );

  if (totalPercentage + percentage > 100) {
    throw new Error(
      `Total blend percentage cannot exceed 100%. Current: ${totalPercentage}%, Adding: ${percentage}%`
    );
  }

  const newBlendFibre = await prisma.blend_fibres.create({
    data: {
      blend_id,
      fibre_id,
      percentage,
    },
    include: {
      fibres: true,
      blends: true,
    },
  });

  return newBlendFibre;
}

// ✅ Get all blend-fibre mappings
async function getAllBlendFibres() {
  return await prisma.blend_fibres.findMany({
    include: {
      fibres: true,
      blends: true,
    },
  });
}

// ✅ Get fibres for a specific blend
async function getFibresByBlend(blendId) {
  return await prisma.blend_fibres.findMany({
    where: {
      blend_id: blendId,
    },
    include: {
      fibres: true,
    },
  });
}

// ✅ Update blend-fibre percentage with check
async function updateBlendFibre(id, newPercentage) {
  const blendFibre = await prisma.blend_fibres.findUnique({
    where: { id },
  });

  if (!blendFibre) {
    throw new Error('BlendFibre mapping not found');
  }

  const existingFibres = await prisma.blend_fibres.findMany({
    where: { blend_id: blendFibre.blend_id },
    select: { id: true, percentage: true },
  });

  const totalOtherPercentage = existingFibres.reduce((sum, f) => {
    if (f.id !== id) return sum + f.percentage;
    return sum;
  }, 0);

  if (totalOtherPercentage + newPercentage > 100) {
    throw new Error(
      `Total blend percentage cannot exceed 100%. Other: ${totalOtherPercentage}%, Updating: ${newPercentage}%`
    );
  }

  return await prisma.blend_fibres.update({
    where: { id },
    data: { percentage: newPercentage },
  });
}

// ✅ Delete blend-fibre mapping
async function deleteBlendFibre(id) {
  return await prisma.blend_fibres.delete({
    where: { id },
  });
}

module.exports = {
  createBlendFibre,
  getAllBlendFibres,
  getFibresByBlend,
  updateBlendFibre,
  deleteBlendFibre,
};