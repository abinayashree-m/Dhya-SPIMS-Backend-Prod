const shadeService = require('../services/shades.service');

// ✅ Create
exports.createShade = async (req, res) => {
  try {
    const {
      shade_code,
      shade_name,
      blend_composition = [],
      raw_cotton_composition = [],
    } = req.body;

    // Basic required validations
    if (!shade_code || !shade_name) {
      return res.status(400).json({
        error: 'shade_code and shade_name are required.',
      });
    }

    // Convert raw_cotton_composition to array if it's an object
    const rawCottonArray = Array.isArray(raw_cotton_composition) 
      ? raw_cotton_composition 
      : raw_cotton_composition 
        ? [raw_cotton_composition] 
        : [];

    if (blend_composition.length === 0 && rawCottonArray.length === 0) {
      return res.status(400).json({
        error: 'At least one fibre or raw cotton composition is required.',
      });
    }

    // Calculate total percentages
    const fibreTotal = blend_composition.reduce((sum, f) => sum + Number(f.percentage || 0), 0);
    const rawCottonTotal = rawCottonArray.reduce((sum, r) => sum + Number(r.percentage || 0), 0);
    const totalPercentage = fibreTotal + rawCottonTotal;

    if (Math.abs(totalPercentage - 100) > 0.01) { // Allow for small floating point differences
      return res.status(400).json({
        error: `Total percentage must equal 100%. Received: ${totalPercentage}%`,
      });
    }

    // Call service with normalized data
    const shade = await shadeService.createShade({
      shade_code,
      shade_name,
      fibre_composition: blend_composition,
      raw_cotton_composition: rawCottonArray,
    });

    res.status(201).json(shade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get all (optional filter)
exports.getAllShades = async (req, res) => {
  try {
    const { fibre_id } = req.query;
    const shades = await shadeService.getAllShades({ fibre_id });
    res.json(shades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get by ID
exports.getShadeById = async (req, res) => {
  try {
    const shade = await shadeService.getShadeById(req.params.id);
    if (!shade) {
      return res.status(404).json({ error: 'Shade not found' });
    }
    res.json(shade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update
exports.updateShade = async (req, res) => {
  try {
    const { blend_composition } = req.body;

    if (blend_composition) {
      const total = blend_composition.reduce((sum, f) => sum + Number(f.percentage), 0);
      if (total !== 100) {
        return res.status(400).json({ error: `Fibre percentage must total 100%. Received: ${total}%` });
      }
    }

    const updated = await shadeService.updateShade(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete
exports.deleteShade = async (req, res) => {
  try {
    const result = await shadeService.deleteShade(req.params.id);
    
    if (!result.success) {
      if (result.code === 'SHADE_NOT_FOUND') {
        return res.status(404).json(result);
      }
      if (result.code === 'SHADE_IN_USE') {
        return res.status(409).json(result);
      }
      return res.status(500).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: err.message 
    });
  }
};

// ✅ Stock Summary
exports.getStockSummary = async (req, res) => {
  try {
    const summary = await shadeService.getShadeStockSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};