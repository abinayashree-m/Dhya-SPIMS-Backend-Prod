const express = require('express');
const router = express.Router();
const blendFibreController = require('../controllers/blendFibres.controller');

/**
 * @swagger
 * tags:
 *   name: BlendFibres
 *   description: API for managing fibre compositions in blends
 */

/**
 * @swagger
 * /blend-fibres:
 *   post:
 *     summary: Create a new blend-fibre mapping
 *     tags: [BlendFibres]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blend_id
 *               - fibre_id
 *               - percentage
 *             properties:
 *               blend_id:
 *                 type: string
 *               fibre_id:
 *                 type: string
 *               percentage:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Successfully created
 *       400:
 *         description: Duplicate or invalid percentage
 */
router.post('/', blendFibreController.createBlendFibre);

/**
 * @swagger
 * /blend-fibres:
 *   get:
 *     summary: Get all blend-fibre mappings
 *     tags: [BlendFibres]
 *     responses:
 *       200:
 *         description: List of blend-fibre mappings
 */
router.get('/', blendFibreController.getAllBlendFibres);

/**
 * @swagger
 * /blend-fibres/{blendId}:
 *   get:
 *     summary: Get fibres by blend ID
 *     tags: [BlendFibres]
 *     parameters:
 *       - in: path
 *         name: blendId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the blend
 *     responses:
 *       200:
 *         description: List of fibres for a specific blend
 */
router.get('/:blendId', blendFibreController.getFibresByBlend);

/**
 * @swagger
 * /blend-fibres/{id}:
 *   put:
 *     summary: Update a blend-fibre percentage
 *     tags: [BlendFibres]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the blend-fibre mapping
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - percentage
 *             properties:
 *               percentage:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully updated
 */
router.put('/:id', blendFibreController.updateBlendFibre);

/**
 * @swagger
 * /blend-fibres/{id}:
 *   delete:
 *     summary: Delete a blend-fibre mapping
 *     tags: [BlendFibres]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the mapping
 *     responses:
 *       204:
 *         description: Successfully deleted
 */
router.delete('/:id', blendFibreController.deleteBlendFibre);

module.exports = router;