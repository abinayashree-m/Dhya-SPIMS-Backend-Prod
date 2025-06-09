// routes/purchaseOrders.routes.js
const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchaseOrders.controller');
const { verifyToken } = require('../middlewares/auth.middleware'); // ✅ Use the correct middleware
const upload = require('../middlewares/upload.middleware'); // 👈 Import multer middleware

router.post(
  '/upload-and-parse',
  verifyToken,
  upload.single('file'), // 'file' must match the field name from the frontend
  purchaseOrdersController.parseAndCreatePurchaseOrder
);

// ✅ Apply verifyToken to all protected routes
router.post('/', verifyToken, purchaseOrdersController.createPurchaseOrder);
router.get('/', verifyToken, purchaseOrdersController.getAllPurchaseOrders);
router.get('/:id', verifyToken, purchaseOrdersController.getPurchaseOrderById);
router.put('/:id', verifyToken, purchaseOrdersController.updatePurchaseOrder);
router.delete('/:id', verifyToken, purchaseOrdersController.deletePurchaseOrder);

router.post('/:id/verify', verifyToken, purchaseOrdersController.verify);
router.post('/:id/convert', verifyToken, purchaseOrdersController.convert);
module.exports = router;