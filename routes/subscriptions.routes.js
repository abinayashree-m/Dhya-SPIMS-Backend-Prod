const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const subscriptionsController = require('../controllers/subscriptions.controller');

// Get all subscriptions
router.get('/', verifyToken, subscriptionsController.getSubscriptions);

// Create subscription
router.post('/', verifyToken, subscriptionsController.createSubscription);

// Update subscription
router.put('/:id', verifyToken, subscriptionsController.updateSubscription);

// Delete subscription
router.delete('/:id', verifyToken, subscriptionsController.deleteSubscription);

module.exports = router;
