const express = require('express');
const router = express.Router();
const {
  getAllTenants,
  getTenantById,
  getTenantDetails,
  createTenant,
  updateTenant,
  updateTenantLogo,
  deactivateTenant
} = require('../controllers/tenants.controller');

const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Multi-tenant management
 */

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: Get all tenants
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tenants (without logos for performance)
 */
router.get('/', verifyToken, requireRole('admin'), getAllTenants);

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: Get tenant by ID
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant object (without logo)
 */
router.get('/:id', verifyToken, requireRole('admin'), getTenantById);

/**
 * @swagger
 * /tenants/{id}/details:
 *   get:
 *     summary: Get tenant details including logo
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Complete tenant details including logo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 name: { type: string }
 *                 domain: { type: string }
 *                 plan: { type: string }
 *                 isActive: { type: boolean }
 *                 logo: { type: string, description: "Base64 encoded logo data" }
 *                 createdAt: { type: string, format: date-time }
 *                 updatedAt: { type: string, format: date-time }
 *       404:
 *         description: Tenant not found
 */
router.get('/:id/details', verifyToken, getTenantDetails);

/**
 * @swagger
 * /tenants:
 *   post:
 *     summary: Create a new tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [name, domain]
 *             properties:
 *               name:
 *                 type: string
 *                 example: NSC Spinning Mills
 *               domain:
 *                 type: string
 *                 example: nscspinning.com
 *               plan:
 *                 type: string
 *                 example: free
 *               logo:
 *                 type: string
 *                 description: Base64 encoded logo data
 *     responses:
 *       201:
 *         description: Tenant created
 */
router.post('/', verifyToken, requireRole('admin'), createTenant);

/**
 * @swagger
 * /tenants/{id}:
 *   put:
 *     summary: Update tenant details
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               name: { type: string }
 *               domain: { type: string }
 *               plan: { type: string }
 *               logo: { type: string, description: "Base64 encoded logo data" }
 *     responses:
 *       200:
 *         description: Tenant updated
 */
router.put('/:id', verifyToken, requireRole('admin'), updateTenant);

/**
 * @swagger
 * /tenants/{id}/logo:
 *   put:
 *     summary: Update tenant logo
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [logo]
 *             properties:
 *               logo:
 *                 type: string
 *                 description: Base64 encoded logo data (with or without data URI prefix)
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *     responses:
 *       200:
 *         description: Logo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     logo: { type: string }
 *                     updatedAt: { type: string, format: date-time }
 *       400:
 *         description: Invalid logo data
 *       404:
 *         description: Tenant not found
 */
router.put('/:id/logo', verifyToken, updateTenantLogo);

/**
 * @swagger
 * /tenants/{id}:
 *   delete:
 *     summary: Deactivate tenant (soft delete)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant deactivated
 */
router.delete('/:id', verifyToken, requireRole('admin'), deactivateTenant);

module.exports = router;