// ✅ Step 1: Add controller: controllers/potentialBuyers.controller.js
const potentialBuyersService = require('../services/potentialBuyers.service');

exports.getAllPotentialBuyers = async (req, res) => {
  console.log('[PotentialBuyer] GET /potential-buyers invoked');
  try {
    const buyers = await potentialBuyersService.getAll();
    console.log(`[PotentialBuyer] Fetched ${buyers.length} buyers`);
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

    const result = await potentialBuyersService.bulkUpload(buyers);
    console.log(`[PotentialBuyer] bulkUpload API result: inserted=${result.inserted}, processed=${result.processed}, total=${result.total}`);
    res.status(201).json(result);
  } catch (err) {
    console.error('❌ Error uploading potential buyers:', err);
    res.status(500).json({ error: 'Failed to upload potential buyers' });
  }
};
