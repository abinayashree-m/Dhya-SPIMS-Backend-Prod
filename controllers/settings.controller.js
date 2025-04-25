const settingsService = require('../services/settings.service');

exports.getTenantSettings = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId; // <- 🔍 safer way to extract tenantId
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant ID in token' });

    const settings = await settingsService.getTenantSettings(tenantId);
    res.json(settings);
  } catch (err) {
    console.error('❌ Error fetching tenant settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

exports.updateTenantSettings = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant ID in token' });

    const settings = await settingsService.updateTenantSettings(tenantId, req.body);
    res.json(settings);
  } catch (err) {
    console.error('❌ Error updating tenant settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};