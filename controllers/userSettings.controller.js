const userSettingsService = require('../services/userSettings.service');

exports.getUserSettings = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const settings = await userSettingsService.getUserSettings(userId);
    res.json(settings);
  } catch (err) {
    console.error('❌ Error fetching user settings:', err);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
};

exports.updateUserSettings = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const settings = await userSettingsService.updateUserSettings(userId, req.body);
    res.json(settings);
  } catch (err) {
    console.error('❌ Error updating user settings:', err);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
};