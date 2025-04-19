const blendService = require('../services/blends.service');

// ✅ Create Blend
exports.createBlend = async (req, res) => {
  try {
    const { blend_code, description } = req.body;
    const newBlend = await blendService.createBlend({ blend_code, description });
    res.status(201).json(newBlend);
  } catch (err) {
    console.error('❌ Error creating blend:', err.message);
    res.status(500).json({ error: 'Failed to create blend' });
  }
};

// ✅ Get All Blends
exports.getAllBlends = async (_req, res) => {
  try {
    const blends = await blendService.getAllBlends();
    res.json(blends);
  } catch (err) {
    console.error('❌ Error fetching blends:', err.message);
    res.status(500).json({ error: 'Failed to fetch blends' });
  }
};

// ✅ Get Blend by ID
exports.getBlendById = async (req, res) => {
  try {
    const { id } = req.params;
    const blend = await blendService.getBlendById(id);
    if (!blend) return res.status(404).json({ error: 'Blend not found' });
    res.json(blend);
  } catch (err) {
    console.error('❌ Error fetching blend:', err.message);
    res.status(500).json({ error: 'Failed to fetch blend' });
  }
};

// ✅ Update Blend
exports.updateBlend = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await blendService.updateBlend(id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('❌ Error updating blend:', err.message);
    res.status(500).json({ error: 'Failed to update blend' });
  }
};

// ✅ Delete Blend
exports.deleteBlend = async (req, res) => {
  try {
    const { id } = req.params;
    await blendService.deleteBlend(id);
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error deleting blend:', err.message);
    res.status(500).json({ error: 'Failed to delete blend' });
  }
};

// ✅ Blend Composition Summary
exports.getBlendSummary = async (_req, res) => {
  try {
    const summary = await blendService.getBlendSummary();
    res.json(summary);
  } catch (err) {
    console.error('❌ Error getting blend summary:', err.message);
    res.status(500).json({ error: 'Failed to fetch blend summary' });
  }
};

// ✅ Fibre Usage Summary
exports.getFibreUsageSummary = async (_req, res) => {
  try {
    const usage = await blendService.getFibreUsageSummary(); // ✅ FIXED
    res.json(usage);
  } catch (err) {
    console.error('❌ Error fetching fibre usage summary:', err.message);
    res.status(500).json({ error: 'Failed to fetch fibre usage summary' });
  }
};