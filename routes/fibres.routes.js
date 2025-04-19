const express = require('express');
const router = express.Router();
const fibreController = require('../controllers/fibres.controller');

/**
 * @swagger
 * tags:
 *   - name: Fibres
 *     description: Manage fibre types and stock
 *   - name: Fibre Categories
 *     description: Manage fibre category types
 */

// -----------------------------
// Fibre Category Routes (Place First!)
// -----------------------------

/**
 * @swagger
 * /fibres/categories:
 *   get:
 *     summary: Get all fibre categories
 *     tags: [Fibre Categories]
 *     responses:
 *       200:
 *         description: List of all fibre categories
 */
router.get('/categories', fibreController.getAllFibreCategories);

/**
 * @swagger
 * /fibres/categories:
 *   post:
 *     summary: Create a new fibre category
 *     tags: [Fibre Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/categories', fibreController.createFibreCategory);

/**
 * @swagger
 * /fibres/categories/{id}:
 *   put:
 *     summary: Update a fibre category
 *     tags: [Fibre Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/categories/:id', fibreController.updateFibreCategory);

/**
 * @swagger
 * /fibres/categories/{id}:
 *   delete:
 *     summary: Delete a fibre category
 *     tags: [Fibre Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Category deleted
 */
router.delete('/categories/:id', fibreController.deleteFibreCategory);

// -----------------------------
// Fibre Routes
// -----------------------------

/**
 * @swagger
 * /fibres:
 *   post:
 *     summary: Create a new fibre
 *     tags: [Fibres]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fibre_name
 *               - fibre_code
 *               - stock_kg
 *             properties:
 *               fibre_name:
 *                 type: string
 *               fibre_code:
 *                 type: string
 *               stock_kg:
 *                 type: number
 *                 format: float
 *               category_id:
 *                 type: string
 *                 description: Optional category ID
 *     responses:
 *       201:
 *         description: Fibre created successfully
 */
router.post('/', fibreController.createFibre);

/**
 * @swagger
 * /fibres:
 *   get:
 *     summary: Get all fibres
 *     tags: [Fibres]
 *     responses:
 *       200:
 *         description: List of all fibres
 */
router.get('/', fibreController.getAllFibres);
/**
 * @swagger
 * /fibres/low-stock:
 *   get:
 *     summary: Get low stock fibres (e.g. stock < 200kg)
 *     tags: [Fibres]
 *     responses:
 *       200:
 *         description: List of fibres with low stock
 */
router.get('/low-stock', fibreController.getLowStockFibres);
/**
 * @swagger
 * /fibres/{id}/usage:
 *   get:
 *     summary: Get fibre usage trend
 *     tags: [Fibres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the fibre
 *     responses:
 *       200:
 *         description: List of usage history
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
 *                   usedKg:
 *                     type: number
 *                     format: float
 *                     example: 23.5
 *       404:
 *         description: Fibre not found or no usage data
 */

router.get('/:id/usage', fibreController.getFiberUsageTrend);

/**
 * @swagger
 * /fibres/{id}:
 *   get:
 *     summary: Get fibre by ID
 *     tags: [Fibres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Fibre ID
 *     responses:
 *       200:
 *         description: Fibre data
 *       404:
 *         description: Fibre not found
 */
router.get('/:id', fibreController.getFibreById);

/**
 * @swagger
 * /fibres/{id}:
 *   put:
 *     summary: Update fibre by ID
 *     tags: [Fibres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fibre_name:
 *                 type: string
 *               fibre_code:
 *                 type: string
 *               stock_kg:
 *                 type: number
 *                 format: float
 *               category_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fibre updated
 */
router.put('/:id', fibreController.updateFibre);

/**
 * @swagger
 * /fibres/{id}:
 *   delete:
 *     summary: Delete a fibre
 *     tags: [Fibres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Fibre deleted successfully
 */
router.delete('/:id', fibreController.deleteFibre);



module.exports = router;