const express = require('express');
const router = express.Router();
const controller = require('../controllers/fibreTransfers.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// Get all transfers (optionally filter by status via query param)
router.get('/', controller.getFibreTransfers);

// Create a new transfer
router.post('/', controller.createTransfer);

// Mark a transfer as received
router.put('/:id/receive', controller.updateReceived);

module.exports = router;