const shadeService = require('../services/shades.service');

// ✅ Create
exports.createShade = async (req, res) => {
  try {
    console.log('🛎️ Received POST /shades');
    console.log('📥 Body:', JSON.stringify(req.body, null, 2));

    const {
      shade_code,
      shade_name,
      fibre_composition = [],
      raw_cotton_composition = [],
    } = req.body;

    // Basic required validations
    if (!shade_code || !shade_name || !Array.isArray(fibre_composition)) {
      console.log('⛔ Missing required fields');
      return res.status(400).json({
        error: 'shade_code, shade_name, and fibre_composition[] are required.',
      });
    }

    if (fibre_composition.length === 0 && raw_cotton_composition.length === 0) {
      console.log('⛔ No composition provided');
      return res.status(400).json({
        error: 'At least one fibre or raw cotton composition is required.',
      });
    }

    // Ensure all composition percentages are numbers
    const fibreTotal = fibre_composition.reduce((sum, f) => sum + Number(f.percentage || 0), 0);
    const rawCottonTotal = raw_cotton_composition.reduce(
      (sum, r) => sum + Number(r.percentage || 0),
      0
    );
    const totalPercentage = fibreTotal + rawCottonTotal;

    console.log('📊 Total %:', totalPercentage);

    if (totalPercentage !== 100) {
      console.log('⛔ Invalid % sum:', totalPercentage);
      return res.status(400).json({
        error: `Total percentage must equal 100%. Received: ${totalPercentage}%`,
      });
    }

    // Call service
    const shade = await shadeService.createShade({
      shade_code,
      shade_name,
      fibre_composition,
      raw_cotton_composition,
    });

    console.log('✅ Created Shade:', shade.id);
    res.status(201).json(shade);
  } catch (err) {
    console.error('🔥 Error in createShade:', err);
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
    console.error('❌ Error in getAllShades:', err);
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
    console.error('❌ Error in getShadeById:', err);
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
    console.error('❌ Error in updateShade:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete
exports.deleteShade = async (req, res) => {
  try {
    await shadeService.deleteShade(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error in deleteShade:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Stock Summary
exports.getStockSummary = async (req, res) => {
  try {
    const summary = await shadeService.getShadeStockSummary();
    res.json(summary);
  } catch (err) {
    console.error('❌ Error in getStockSummary:', err);
    res.status(500).json({ error: err.message });
  }
};