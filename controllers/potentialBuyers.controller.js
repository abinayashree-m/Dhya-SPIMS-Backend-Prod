// ✅ Step 1: Add controller: controllers/potentialBuyers.controller.js
const potentialBuyersService = require('../services/potentialBuyers.service');

exports.getAllPotentialBuyers = async (req, res) => {
  try {
    const buyers = await potentialBuyersService.getAll();
    res.json(buyers);
  } catch (err) {
    console.error('❌ Error fetching potential buyers:', err);
    res.status(500).json({ error: 'Failed to fetch potential buyers' });
  }
};

// controllers/potentialBuyers.controller.js
exports.bulkUpload = async (req, res) => {
  try {
    const { buyers } = req.body;

    if (!Array.isArray(buyers)) {
      return res.status(400).json({ error: 'Invalid payload: buyers should be an array' });
    }

    const uploaded = await potentialBuyersService.bulkUpload(buyers);
    res.status(201).json({ inserted: uploaded.count }); // Prisma returns { count }
  } catch (err) {
    console.error('❌ Error uploading potential buyers:', err);
    res.status(500).json({ error: 'Failed to upload potential buyers' });
  }
};
