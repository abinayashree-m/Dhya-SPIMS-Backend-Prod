// routes/purchaseOrders.routes.js
const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchaseOrders.controller');
const { verifyToken } = require('../middlewares/auth.middleware'); // ✅ Use the correct middleware

// ✅ Apply verifyToken to all protected routes
router.post('/', verifyToken, purchaseOrdersController.createPurchaseOrder);
router.get('/', verifyToken, purchaseOrdersController.getAllPurchaseOrders);
router.get('/:id', verifyToken, purchaseOrdersController.getPurchaseOrderById);
router.put('/:id', verifyToken, purchaseOrdersController.updatePurchaseOrder);
router.delete('/:id', verifyToken, purchaseOrdersController.deletePurchaseOrder);

module.exports = router;