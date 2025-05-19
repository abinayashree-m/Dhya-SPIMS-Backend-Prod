const express = require('express');
const router = express.Router();
const controller = require('../controllers/marketing.controller');

router.post('/send', controller.sendBulkEmail);
router.get('/campaigns', controller.getCampaigns); // ✅ FIXED

module.exports = router;