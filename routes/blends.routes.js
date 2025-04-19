const express = require('express');
const router = express.Router();
const blendController = require('../controllers/blends.controller');

/**
 * @swagger
 * tags:
 *   name: Blends
 *   description: Manage blends and their fibre compositions
 */

/**
 * @swagger
 * /blends:
 *   post:
 *     summary: Create a new blend
 *     tags: [Blends]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blend_code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Blend created
 */
router.post('/', blendController.createBlend);

/**
 * @swagger
 * /blends:
 *   get:
 *     summary: Get all blends
 *     tags: [Blends]
 *     responses:
 *       200:
 *         description: List of blends
 */
router.get('/', blendController.getAllBlends);

/**
 * @swagger
 * /blends/summary:
 *   get:
 *     summary: Get blend + fibre + percentage summary
 *     tags: [Blends]
 *     responses:
 *       200:
 *         description: Blend summary with limiting stock
 */
router.get('/summary', blendController.getBlendSummary);

/**
 * @swagger
 * /blends/fibre-usage:
 *   get:
 *     summary: Get total fibre usage summary across all blends
 *     tags: [Blends]
 *     responses:
 *       200:
 *         description: Summary of fibre usage (grouped by fibre)
 */
router.get('/fibre-usage', blendController.getFibreUsageSummary);

/**
 * @swagger
 * /blends/{id}:
 *   get:
 *     summary: Get blend by ID
 *     tags: [Blends]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blend ID
 *     responses:
 *       200:
 *         description: Blend details
 */
router.get('/:id', blendController.getBlendById);

/**
 * @swagger
 * /blends/{id}:
 *   put:
 *     summary: Update blend
 *     tags: [Blends]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blend ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blend_code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Blend updated
 */
router.put('/:id', blendController.updateBlend);

/**
 * @swagger
 * /blends/{id}:
 *   delete:
 *     summary: Delete a blend
 *     tags: [Blends]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blend ID
 *     responses:
 *       204:
 *         description: Blend deleted
 */
router.delete('/:id', blendController.deleteBlend);

module.exports = router;