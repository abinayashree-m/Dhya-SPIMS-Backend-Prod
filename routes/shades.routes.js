const express = require('express');
const router = express.Router();
const controller = require('../controllers/shades.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Shades
 *   description: Manage shade codes, colors, and fibre compositions
 */

/**
 * @swagger
 * /shades:
 *   get:
 *     summary: Get all shades (optionally filter by fibre_id)
 *     tags: [Shades]
 *     parameters:
 *       - in: query
 *         name: fibre_id
 *         schema:
 *           type: string
 *         description: Filter shades by fibre ID
 *     responses:
 *       200:
 *         description: List of shades
 */
router.get('/', controller.getAllShades);

/**
 * @swagger
 * /shades/stock-summary:
 *   get:
 *     summary: Get total available stock for each shade (grouped)
 *     tags: [Shades]
 *     responses:
 *       200:
 *         description: Aggregated stock summary
 */
router.get('/stock-summary', controller.getStockSummary);

/**
 * @swagger
 * /shades/{id}:
 *   get:
 *     summary: Get a shade by ID (with fibre composition)
 *     tags: [Shades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shade ID
 *     responses:
 *       200:
 *         description: Shade details
 *       404:
 *         description: Shade not found
 */
router.get('/:id', controller.getShadeById);

/**
 * @swagger
 * /shades:
 *   post:
 *     summary: Create a new shade with multiple fibres
 *     tags: [Shades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shade_code
 *               - shade_name
 *               - fibre_composition
 *             properties:
 *               shade_code:
 *                 type: string
 *                 example: SHD12345
 *               shade_name:
 *                 type: string
 *                 example: Light Grey
 *               percentage:
 *                 type: string
 *                 example: 100%
 *               fibre_composition:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - fibre_id
 *                     - percentage
 *                   properties:
 *                     fibre_id:
 *                       type: string
 *                       example: 3cd43b5c-1aa7-4a05-809f-28c4c428528d
 *                     percentage:
 *                       type: integer
 *                       example: 70
 *     responses:
 *       201:
 *         description: Shade created successfully
 */
router.post('/', controller.createShade);

/**
 * @swagger
 * /shades/{id}:
 *   put:
 *     summary: Update an existing shade and its fibre composition
 *     tags: [Shades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shade ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shade_code:
 *                 type: string
 *               shade_name:
 *                 type: string
 *               percentage:
 *                 type: string
 *               fibre_composition:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fibre_id:
 *                       type: string
 *                     percentage:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Shade updated successfully
 *       404:
 *         description: Shade not found
 */
router.put('/:id', controller.updateShade);

/**
 * @swagger
 * /shades/{id}:
 *   delete:
 *     summary: Delete a shade
 *     tags: [Shades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shade ID
 *     responses:
 *       204:
 *         description: Shade deleted successfully
 *       404:
 *         description: Shade not found
 */
router.delete('/:id', controller.deleteShade);

module.exports = router;