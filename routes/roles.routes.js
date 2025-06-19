//pullable request
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       required:
 *         - tenant_id
 *         - name
 *         - permissions
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenant_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         permissions:
 *           type: object
 *           additionalProperties:
 *             type: array
 *             items:
 *               type: string
 */

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Manage roles for tenants
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles for a tenant
 *     tags: [Roles]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Tenant ID to filter roles
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *       400:
 *         description: Missing tenantId
 *       500:
 *         description: Server error
 */
router.get('/', roleController.getRoles);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Server error
 */
router.post('/', roleController.createRole);

/**
 * @swagger
 * /roles:
 *   put:
 *     summary: Admin updates an existing role
 *     tags: [Roles]
 *     parameters:
 *       - in: query
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin role ID performing the update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       403:
 *         description: Only admin role can update roles
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.put('/', roleController.updateRole);

/**
 * @swagger
 * /roles:
 *   delete:
 *     summary: Delete a role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the role to delete
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Missing or invalid role ID
 *       500:
 *         description: Server error
 */
router.delete('/', roleController.deleteRole);

/**
 * @swagger
 * /roles/permissions:
 *   get:
 *     summary: Get list of all modules with permissions
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: Permission list by module
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               Orders:
 *                 - Add Order
 *                 - Update Order
 *                 - Delete Order
 *                 - View Order
 *                 - Export Order
 */
//router.get('/permissions', roleController.getRolePermissions);
router.get('/permissions', roleController.getPermissions);

module.exports = router;



