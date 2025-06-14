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
 * /api/production/date/{date}:
 *   get:
 *     summary: Get production entries for a specific date
 *     tags: [Production]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: List of production entries for the date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Production'
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Unauthorized
 */
router.get('/date/:date', controller.getProductionByDate);

/**
 * @swagger
 * /api/production:
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
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               blow_room:
 *                 type: object
 *                 properties:
 *                   total:
 *                     type: number
 *                   remarks:
 *                     type: string
 *               carding:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     machine:
 *                       type: string
 *                     shift:
 *                       type: string
 *                     production_kg:
 *                       type: number
 *                     required_qty:
 *                       type: number
 *                     remarks:
 *                       type: string
 *               drawing:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductionSectionEntry'
 *               framing:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductionSectionEntry'
 *               simplex:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductionSectionEntry'
 *               spinning:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductionSectionEntry'
 *               autoconer:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductionSectionEntry'
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Production entry created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/', controller.createProduction);

/**
 * @swagger
 * /api/production/{id}:
 *   put:
 *     summary: Update an existing production entry
 *     tags: [Production]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Production entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blowRoom:
 *                 type: object
 *                 properties:
 *                   total:
 *                     type: number
 *                     minimum: 0
 *                   remarks:
 *                     type: string
 *               carding:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SectionRow'
 *               drawing:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SectionRow'
 *               framing:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SectionRow'
 *               simplex:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SectionRow'
 *               spinning:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SectionRow'
 *               autoconer:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SectionRow'
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Production entry updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Production entry not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', controller.updateProduction);

/**
 * @swagger
 * /api/production/{id}:
 *   delete:
 *     summary: Delete a production entry
 *     tags: [Production]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Production entry ID
 *     responses:
 *       200:
 *         description: Production entry deleted successfully
 *       404:
 *         description: Production entry not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', controller.deleteProduction);

/**
 * @swagger
 * /api/production:
 *   get:
 *     summary: List all production entries
 *     tags: [Production]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in YYYY-MM-DD format
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in YYYY-MM-DD format
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of production entries with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Production'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/', controller.listProductions);

/**
 * @swagger
 * components:
 *   schemas:
 *     SectionRow:
 *       type: object
 *       required:
 *         - machine
 *         - shift
 *         - production_kg
 *       properties:
 *         machine:
 *           type: string
 *         shift:
 *           type: string
 *         production_kg:
 *           type: number
 *           minimum: 0
 *         required_qty:
 *           type: number
 *           minimum: 0
 *     Production:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         blow_room:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             remarks:
 *               type: string
 *         carding:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SectionRow'
 *         drawing:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SectionRow'
 *         framing:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SectionRow'
 *         simplex:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SectionRow'
 *         spinning:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SectionRow'
 *         autoconer:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SectionRow'
 *         total:
 *           type: number
 *         remarks:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

module.exports = router;