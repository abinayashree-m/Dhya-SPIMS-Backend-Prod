const express = require('express');
const router = express.Router();
const controller = require('../controllers/orders.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const multer = require('multer');
const upload = multer({ dest: 'upload/' });

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Manage orders linked to buyers and shades (requires JWT)
 */

// Apply JWT verification middleware to all routes
router.use(verifyToken);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders for the logged-in tenant
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', controller.getAllOrders);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order for the logged-in tenant
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buyer_id
 *               - shade_id
 *               - quantity_kg
 *               - delivery_date
 *             properties:
 *               order_number:
 *                 type: string
 *                 example: SO-456789
 *               buyer_id:
 *                 type: string
 *               shade_id:
 *                 type: string
 *               quantity_kg:
 *                 type: number
 *               delivery_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 example: pending
 *               realisation:
 *                 type: number
 *                 format: float
 *                 example: 85.5
 *     responses:
 *       201:
 *         description: Order created
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate order number
 *       500:
 *         description: Failed to create order
 */
router.post('/', controller.createOrder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a specific order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', controller.getOrderById);

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Update an existing order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_number:
 *                 type: string
 *               buyer_id:
 *                 type: string
 *               shade_id:
 *                 type: string
 *               quantity_kg:
 *                 type: number
 *               delivery_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *               realisation:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       500:
 *         description: Failed to update order
 */
router.put('/:id', controller.updateOrder);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Update only the status of an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, dispatched, completed]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       500:
 *         description: Failed to update status
 */
router.put('/:id/status', controller.updateOrderStatus);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       204:
 *         description: Order deleted successfully
 *       500:
 *         description: Failed to delete order
 */
router.delete('/:id', controller.deleteOrder);

/**
 * @swagger
 * /orders/bulk-upload:
 *   post:
 *     summary: Bulk import orders from Excel
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Bulk import completed
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Failed to process Excel file
 */
router.post('/bulk-upload', upload.single('file'), controller.bulkImportOrders);
/**
 * @swagger
 * /orders/{id}/progress-details:
 *   get:
 *     summary: Get full progress details for an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress metrics for the selected order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requiredQty:
 *                   type: number
 *                   example: 1200
 *                 producedQty:
 *                   type: number
 *                   example: 843.5
 *                 averageEfficiency:
 *                   type: number
 *                   example: 72.3
 *                 topProductionDay:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: 2025-04-12
 *                     production:
 *                       type: number
 *                       example: 500
 *                 noProductionDays:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: "2025-04-14"
 *       404:
 *         description: Order not found
 *       500:
 *         description: Failed to fetch progress details
 */
router.get('/:id/progress-details', controller.getOrderProgressDetails);
module.exports = router;