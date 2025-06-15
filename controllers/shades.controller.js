const shadesService = require('../services/shades.service');

// ✅ Create
exports.createShade = async (req, res) => {
  try {
    console.log('Creating shade with data:', req.body);
    
    // Validate required fields
    if (!req.body.shade_code || !req.body.shade_name) {
      return res.status(400).json({ error: 'shade_code and shade_name are required' });
    }

    // Create the shade with the user's tenant ID
    const shade = await shadesService.createShade({
      ...req.body,
      tenantId: req.user.tenantId
    });
    
    res.status(201).json(shade);
  } catch (error) {
    console.error('Error in createShade controller:', error);
    res.status(500).json({ error: error.message || 'Failed to create shade' });
  }
};

// ✅ Get all shades
exports.getAllShades = async (_req, res) => {
  try {
    const shades = await shadesService.getAllShades();
    res.json(shades);
  } catch (error) {
    console.error('Error fetching shades:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get shade by ID
exports.getShadeById = async (req, res) => {
  try {
    const shade = await shadesService.getShadeById(req.params.id);
    res.json(shade);
  } catch (error) {
    console.error('Error fetching shade:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update
exports.updateShade = async (req, res) => {
  try {
    const { id } = req.params;
    const shade = await shadesService.updateShade(id, req.body, req.user.tenantId);
    res.json(shade);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shade' });
  }
};

// ✅ Delete
exports.deleteShade = async (req, res) => {
  try {
    const { id } = req.params;
    await shadesService.deleteShade(id, req.user.tenantId);
    res.json({ message: 'Shade deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shade' });
  }
};

// ✅ Stock Summary
exports.getStockSummary = async (req, res) => {
  try {
    const summary = await shadesService.getShadeStockSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};