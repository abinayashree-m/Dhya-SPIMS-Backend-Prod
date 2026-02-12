const { prisma } = require('../prisma/client');
const { validate: isUUID } = require('uuid');
const { Decimal } = require('@prisma/client/runtime/library');

/**
 * ✅ Create a new fibre (with optional categoryId)
 */
exports.createFibre = async (data) => {
  const { fibreName, fibreCode, stockKg, categoryId } = data;

  return await prisma.fibre.create({
    data: {
      fibreName,
      fibreCode,
      stockKg,
      categoryId,
    },
  });
};

/**
 * ✅ Get all fibres with category info
 */
exports.getAllFibres = async () => {
  return await prisma.fibre.findMany({
    orderBy: { fibreName: 'asc' },
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

  return await prisma.fibre.findUnique({
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

  const { fibreName, fibreCode, stockKg, categoryId } = data;

  return await prisma.fibre.update({
    where: { id },
    data: {
      fibreName,
      fibreCode,
      stockKg,
      categoryId,
    },
  });
};

/**
 * ✅ Delete fibre (with UUID validation)
 */
exports.deleteFibre = async (id) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for fibre ID: ${id}`);

  return await prisma.fibre.delete({
    where: { id },
  });
};

/**
 * ✅ Get all fibre categories
 */
exports.getAllFibreCategories = async () => {
  return await prisma.fibreCategory.findMany({
    orderBy: { name: 'asc' },
  });
};

/**
 * ✅ Get fibre category by ID
 */
exports.getFibreCategoryById = async (id) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for category ID: ${id}`);
  
  return await prisma.fibreCategory.findUnique({
    where: { id },
  });
};

/**
 * ✅ Get fibre category by name
 */
exports.getFibreCategoryByName = async (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Category name is required and must be a string');
  }
  
  return await prisma.fibreCategory.findUnique({
    where: { name: name.trim() },
  });
};

/**
 * ✅ Create a new fibre category
 */
exports.createFibreCategory = async (data) => {
  return await prisma.fibreCategory.create({
    data,
  });
};

/**
 * ✅ Update a fibre category by ID
 */
exports.updateFibreCategory = async (id, data) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for category ID: ${id}`);

  return await prisma.fibreCategory.update({
    where: { id },
    data,
  });
};

/**
 * ✅ Delete a fibre category
 */
exports.deleteFibreCategory = async (id) => {
  if (!isUUID(id)) throw new Error(`Invalid UUID for category ID: ${id}`);

  return await prisma.fibreCategory.delete({
    where: { id },
  });
};

/**
 * ✅ Get low stock fibres (< 200kg)
 */
exports.getLowStockFibres = async () => {
  try {
    return await prisma.fibre.findMany({
      where: {
        stockKg: {
          lt: new Decimal(200),
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        stockKg: 'asc',
      },
    });
  } catch (error) {
    console.error('🔥 Error in getLowStockFibres:', error);
    throw error; // Throw the original error for better debugging
  }
};

/**
 * ✅ Get fibre usage trend data grouped by day
 */
exports.getFiberUsageTrend = async (fibreId) => {
  if (!isUUID(fibreId)) throw new Error(`Invalid UUID for fibre ID: ${fibreId}`);

  return await prisma.fibreUsageLog.groupBy({
    by: ['timestamp'],
    where: { fibreId: fibreId },
    _sum: {
      quantity: true,
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
};