const { parsePurchaseOrderText } = require('../services/parse.service');

exports.parsePurchaseOrderText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text in request body' });
    }

    console.log('📥 Received PO text for parsing');

    const parsed = await parsePurchaseOrderText(text);

    console.log('✅ Parsed PO data:', parsed);

    // Send to frontend for user verification
    return res.json(parsed);
  } catch (err) {
    console.error('❌ Error in controller while parsing PO:', err.message);
    return res.status(500).json({ error: 'Failed to parse purchase order' });
  }
};