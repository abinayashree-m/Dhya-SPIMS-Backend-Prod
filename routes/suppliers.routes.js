const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/suppliers.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Suppliers
 *   description: Manage suppliers (CRUD)
 */

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of suppliers
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', supplierController.getAllSuppliers);

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     summary: Get a supplier by ID
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Supplier ID (UUID)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier details
 *       404:
 *         description: Supplier not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', supplierController.getSupplierById);

/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Create a new supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
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
 *               contact:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Supplier created
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create supplier
 */
router.post('/', supplierController.createSupplier);

/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     summary: Update a supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Supplier ID (UUID)
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Server error
 */
router.put('/:id', supplierController.updateSupplier);

/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     summary: Delete a supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Supplier ID (UUID)
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Supplier deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;