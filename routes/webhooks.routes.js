const express = require('express');
const router = express.Router();
const controller = require('../controllers/webhooks.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

console.log('🔧 [ROUTES] Loading webhook routes...');

// Webhook endpoint for Resend (no auth required)
router.post('/resend', (req, res, next) => {
  console.log('🚀 [ROUTES] POST /webhooks/resend route hit');
  next();
}, controller.handleResendWebhook);

// Protected routes for analytics and management
router.use(verifyToken);

// Email events and analytics
router.get('/events', (req, res, next) => {
  console.log('📊 [ROUTES] GET /webhooks/events route hit');
  next();
}, controller.getEmailEvents);

router.get('/analytics', (req, res, next) => {
  console.log('📈 [ROUTES] GET /webhooks/analytics route hit');
  next();
}, controller.getEmailAnalytics);

// Bounce management
router.get('/bounces', (req, res, next) => {
  console.log('📧 [ROUTES] GET /webhooks/bounces route hit');
  next();
}, controller.getBouncedEmails);

router.delete('/bounces/:email', (req, res, next) => {
  console.log('🗑️ [ROUTES] DELETE /webhooks/bounces/:email route hit');
  next();
}, controller.removeBouncedEmail);

console.log('✅ [ROUTES] Webhook routes loaded successfully');

module.exports = router; 