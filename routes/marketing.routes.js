const express = require('express');
const router = express.Router();
const controller = require('../controllers/marketing.controller');

router.post('/send', controller.sendBulkEmail);
router.post('/send-to-audience', controller.sendToAudience);
router.post('/send-large', controller.sendLargeBulkEmail);
router.post('/analyze-direct-emails', controller.analyzeDirectEmails);

router.post('/fetch-email-details', controller.fetchEmailDetails);
router.get('/campaigns', controller.getCampaigns);
router.get('/campaigns/:id', controller.getCampaignById);
router.get('/campaigns/:id/missed-emails', controller.getCampaignMissedEmails);
router.post('/campaigns/:id/resend-missed', controller.resendMissedEmails);
router.get('/campaigns/:id/status', controller.getCampaignStatus);

module.exports = router;