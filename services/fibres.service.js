const { PrismaClient } = require('@prisma/client');
const { validate: isUUID } = require('uuid');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

/**
 * ✅ Create a new fibre (with optional category_id)
 */
exports.createFibre = async (data) => {
  const { fibre_name, fibre_code, stock_kg, category_id } = data;

  return await prisma.fibres.create({
    data: {
      fibre_name,
      fibre_code,
      stock_kg,
      category_id,
    },
  });
};

/**
 * ✅ Get all fibres with category info
 */
exports.getAllFibres = async () => {
  return await prisma.fibres.findMany({
    orderBy: { fibre_name: 'asc' },
    include: {
      category: true,
    },
  });
};

/**
 * ✅ Get a single fibre by ID (with category) with UUID validation
 */
exports.getFibreById = async (id) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for fibre ID: ${id}`);

  return await prisma.fibres.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });
};

/**
 * ✅ Update fibre (with UUID validation)
 */
exports.updateFibre = async (id, data) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for fibre ID: ${id}`);

  const { fibre_name, fibre_code, stock_kg, category_id } = data;

  return await prisma.fibres.update({
    where: { id },
    data: {
      fibre_name,
      fibre_code,
      stock_kg,
      category_id,
    },
  });
};

/**
 * ✅ Delete fibre (with UUID validation)
 */
exports.deleteFibre = async (id) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for fibre ID: ${id}`);

  return await prisma.fibres.delete({
    where: { id },
  });
};

/**
 * ✅ Get all fibre categories
 */
exports.getAllFibreCategories = async () => {
  return await prisma.fibre_categories.findMany({
    orderBy: { name: 'asc' },
  });
};

/**
 * ✅ Create a new fibre category
 */
exports.createFibreCategory = async (data) => {
  return await prisma.fibre_categories.create({
    data,
  });
};

/**
 * ✅ Update a fibre category by ID
 */
exports.updateFibreCategory = async (id, data) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for category ID: ${id}`);

  return await prisma.fibre_categories.update({
    where: { id },
    data,
  });
};

/**
 * ✅ Delete a fibre category
 */
exports.deleteFibreCategory = async (id) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for category ID: ${id}`);

  return await prisma.fibre_categories.delete({
    where: { id },
  });
};

/**
 * ✅ Get low stock fibres (< 200kg)
 */
exports.getLowStockFibres = async () => {
  try {
    return await prisma.fibres.findMany({
      where: {
        stock_kg: {
          lt: new Decimal(200),
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        stock_kg: 'asc',
      },
    });
  } catch (error) {
    console.error('🔥 Error in getLowStockFibres:', error);
    throw new Error('Failed to fetch fibre');
  }
};

/**
 * ✅ Get fibre usage trend data grouped by day
 */
exports.getFiberUsageTrend = async (fibreId) => {
  if (!isUUID(fibreId)) throw new Error(`Invalid UUID for fibre ID: ${fibreId}`);

  return await prisma.fibre_usage_logs.groupBy({
    by: ['used_on'],
    where: { fibre_id: fibreId },
    _sum: {
      used_kg: true,
    },
    orderBy: {
      used_on: 'desc',
    },
  });
};