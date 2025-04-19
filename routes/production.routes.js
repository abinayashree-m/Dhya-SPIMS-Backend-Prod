const express = require('express');
const router = express.Router();
const controller = require('../controllers/production.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   - name: Productions
 *     description: Manage production entries for orders
 */

// Apply JWT middleware to all routes
router.use(verifyToken);

/**
 * @swagger
 * /productions:
 *   get:
 *     summary: Get all production entries for the logged-in tenant
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all production records
 *       401:
 *         description: Unauthorized
 */
router.get('/', controller.getAllProductions);

/**
 * @swagger
 * /productions/logs:
 *   get:
 *     summary: Get daily production logs (grouped by date)
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of daily logs with production summaries
 *       401:
 *         description: Unauthorized
 */
router.get('/logs', controller.getProductionLogs);

/**
 * @swagger
 * /productions/analytics:
 *   get:
 *     summary: Get production analytics (cumulative, machine-wise, etc.)
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics metrics for progress charts
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', controller.getProductionAnalytics);
/**
 * @swagger
 * /productions/progress/{orderId}:
 *   get:
 *     summary: Get cumulative production progress for a specific order
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress data returned
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
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/progress/:orderId', controller.getOrderProgress);
/**
 * @swagger
 * /productions/efficiency/daily:
 *   get:
 *     summary: Get daily production efficiency
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of efficiency records grouped by date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2025-04-18"
 *                   total_produced:
 *                     type: number
 *                     example: 823.5
 *                   total_required:
 *                     type: number
 *                     example: 1020.75
 *                   efficiency:
 *                     type: number
 *                     example: 80.7
 *       401:
 *         description: Unauthorized
 */

router.get('/efficiency/daily', controller.getDailyEfficiency);

/**
 * @swagger
 * /productions/efficiency/machine:
 *   get:
 *     summary: Get machine-wise production efficiency
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of average efficiencies grouped by machine
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   machine:
 *                     type: string
 *                     example: "Drawing Br1"
 *                   total_produced:
 *                     type: number
 *                     example: 2893.8
 *                   avg_efficiency:
 *                     type: number
 *                     example: 83.25
 *                   days:
 *                     type: number
 *                     example: 5
 *       401:
 *         description: Unauthorized
 */
router.get('/efficiency/machine', controller.getMachineEfficiency);

/**
 * @swagger
 * /productions/{id}:
 *   get:
 *     summary: Get a production entry by ID
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Production ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Production entry found
 *       404:
 *         description: Production entry not found
 */
router.get('/:id', controller.getProductionById);



/**
 * @swagger
 * /productions:
 *   post:
 *     summary: Create a new production entry
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - section
 *               - machine
 *               - shift
 *               - production_kg
 *               - required_qty
 *               - tenant_id
 *               - order_id
 *               - user_id
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *               section:
 *                 type: string
 *               machine:
 *                 type: string
 *               shift:
 *                 type: string
 *               count:
 *                 type: string
 *               hank:
 *                 type: number
 *               production_kg:
 *                 type: number
 *               required_qty:
 *                 type: number
 *               remarks:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, final]
 *               tenant_id:
 *                 type: string
 *               order_id:
 *                 type: string
 *               user_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Production entry created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', controller.createProduction);

/**
 * @swagger
 * /productions/{id}:
 *   put:
 *     summary: Update a production entry
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Production ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               section:
 *                 type: string
 *               machine:
 *                 type: string
 *               shift:
 *                 type: string
 *               count:
 *                 type: string
 *               hank:
 *                 type: number
 *               production_kg:
 *                 type: number
 *               required_qty:
 *                 type: number
 *               remarks:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Production updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Production not found
 */
router.put('/:id', controller.updateProduction);

/**
 * @swagger
 * /productions/{id}:
 *   delete:
 *     summary: Delete a production entry
 *     tags: [Productions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Production ID
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Production deleted successfully
 *       404:
 *         description: Production not found
 */
router.delete('/:id', controller.deleteProduction);


module.exports = router;