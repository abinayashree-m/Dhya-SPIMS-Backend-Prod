const dashboardService = require('../services/dashboard.service');

/**
 * Get comprehensive dashboard summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
}; 