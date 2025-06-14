const { parsePurchaseOrderText } = require('../services/parse.service');

exports.parsePurchaseOrderText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text in request body' });
    }

    const parsed = await parsePurchaseOrderText(text);

    // Send to frontend for user verification
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to parse purchase order' });
  }
};