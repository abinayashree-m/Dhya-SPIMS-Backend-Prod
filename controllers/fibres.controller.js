const fibreService = require('../services/fibres.service');

/**
 * ✅ Create a new fibre (with optional category)
 */
exports.createFibre = async (req, res) => {
  try {
    const fibre = await fibreService.createFibre(req.body);
    res.status(201).json(fibre);
  } catch (error) {
    console.error('❌ Error creating fibre:', error.message);
    res.status(500).json({ error: 'Failed to create fibre' });
  }
};

/**
 * ✅ Get all fibres (including category)
 */
exports.getAllFibres = async (_req, res) => {
  try {
    const fibres = await fibreService.getAllFibres();
    res.json(fibres);
  } catch (error) {
    console.error('❌ Error fetching fibres:', error.message);
    res.status(500).json({ error: 'Failed to fetch fibres' });
  }
};

/**
 * ✅ Get fibre by ID (including category)
 */
exports.getFibreById = async (req, res) => {
  try {
    const fibre = await fibreService.getFibreById(req.params.id);
    if (!fibre) return res.status(404).json({ error: 'Fibre not found' });
    res.json(fibre);
  } catch (error) {
    console.error('❌ Error fetching fibre:', error.message);
    res.status(500).json({ error: 'Failed to fetch fibre' });
  }
};

/**
 * ✅ Update fibre (with optional category change)
 */
exports.updateFibre = async (req, res) => {
  try {
    const fibre = await fibreService.updateFibre(req.params.id, req.body);
    res.json(fibre);
  } catch (error) {
    console.error('❌ Error updating fibre:', error.message);
    res.status(500).json({ error: 'Failed to update fibre' });
  }
};

/**
 * ✅ Delete fibre
 */
exports.deleteFibre = async (req, res) => {
  try {
    await fibreService.deleteFibre(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error deleting fibre:', error.message);
    res.status(500).json({ error: 'Failed to delete fibre' });
  }
};

/**
 * ✅ Get all fibre categories
 */
exports.getAllFibreCategories = async (_req, res) => {
  try {
    const categories = await fibreService.getAllFibreCategories();
    res.json(categories);
  } catch (error) {
    console.error('❌ Error fetching fibre categories:', error.message);
    res.status(500).json({ error: 'Failed to fetch fibre categories' });
  }
};

/**
 * ✅ Create new fibre category
 */
exports.createFibreCategory = async (req, res) => {
  try {
    const category = await fibreService.createFibreCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ Error creating category:', error.message);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

/**
 * ✅ Update a fibre category
 */
exports.updateFibreCategory = async (req, res) => {
  try {
    const category = await fibreService.updateFibreCategory(req.params.id, req.body);
    res.json(category);
  } catch (error) {
    console.error('❌ Error updating category:', error.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

/**
 * ✅ Delete a fibre category
 */
exports.deleteFibreCategory = async (req, res) => {
  try {
    await fibreService.deleteFibreCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error deleting category:', error.message);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

/**
 * ✅ Get low stock fibres (< 200kg)
 */
exports.getLowStockFibres = async (req, res) => {
  try {
    const fibres = await fibreService.getLowStockFibres();
    res.json(fibres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ✅ Get fibre usage trend data grouped by day
 */
exports.getFiberUsageTrend = async (req, res) => {
  try {
    const { id } = req.params;
    const trend = await fibreService.getFiberUsageTrend(id);
    res.json(
      trend.map((entry) => ({
        date: entry.used_on,
        usedKg: parseFloat(entry._sum.used_kg),
      })).reverse()
    );
  } catch (error) {
    console.error('Error loading trend:', error);
    res.status(500).json({ error: 'Failed to load trend' });
  }
};