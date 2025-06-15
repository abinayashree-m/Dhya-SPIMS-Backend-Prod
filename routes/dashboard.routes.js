const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

// Get dashboard summary
router.get('/summary', verifyToken, dashboardController.getDashboardSummary);

module.exports = router; 