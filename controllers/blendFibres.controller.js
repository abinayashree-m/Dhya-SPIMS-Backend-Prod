const blendFibreService = require('../services/blendFibres.service');

// ✅ Create a new blend-fibre mapping
exports.createBlendFibre = async (req, res) => {
  try {
    const { blend_id, fibre_id, percentage } = req.body;

    const newEntry = await blendFibreService.createBlendFibre({
      blend_id,
      fibre_id,
      percentage,
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error('❌ Error creating blend fibre:', error.message);
    res.status(400).json({ error: error.message });
  }
};

// ✅ Get all blend-fibre mappings
exports.getAllBlendFibres = async (_req, res) => {
  try {
    const list = await blendFibreService.getAllBlendFibres();
    res.json(list);
  } catch (error) {
    console.error('❌ Error fetching blend fibres:', error.message);
    res.status(500).json({ error: 'Failed to fetch blend fibres' });
  }
};

// ✅ Get all fibres for a specific blend
exports.getFibresByBlend = async (req, res) => {
  try {
    const { blendId } = req.params;
    const fibres = await blendFibreService.getFibresByBlend(blendId);
    res.json(fibres);
  } catch (error) {
    console.error('❌ Error fetching fibres for blend:', error.message);
    res.status(500).json({ error: 'Failed to fetch fibres for blend' });
  }
};

// ✅ Update a blend-fibre percentage
exports.updateBlendFibre = async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage } = req.body;

    const updated = await blendFibreService.updateBlendFibre(id, percentage);
    res.json(updated);
  } catch (error) {
    console.error('❌ Error updating blend fibre:', error.message);
    res.status(400).json({ error: error.message });
  }
};

// ✅ Delete a blend-fibre entry
exports.deleteBlendFibre = async (req, res) => {
  try {
    const { id } = req.params;
    await blendFibreService.deleteBlendFibre(id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error deleting blend fibre:', error.message);
    res.status(500).json({ error: 'Failed to delete blend fibre' });
  }
};