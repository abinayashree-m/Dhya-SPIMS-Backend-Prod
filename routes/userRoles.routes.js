const express = require('express');
const router = express.Router();
const { createRole, getRolesByTenant } = require('../controllers/userRoles.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: User Roles
 *   description: Manage role definitions for a tenant
 */

/**
 * @swagger
 * /user-roles:
 *   post:
 *     summary: Create a new role
 *     tags: [User Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenant_id
 *               - name
 *             properties:
 *               tenant_id:
 *                 type: string
 *               name:
 *                 type: string
 *               permissions:
 *                 type: object
 *                 example:
 *                   canEditOrders: true
 *                   canDeleteUsers: false
 *     responses:
 *       201:
 *         description: Role created
 *       409:
 *         description: Role already exists
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /user-roles:
 *   get:
 *     summary: Get all roles for a tenant
 *     tags: [User Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of roles
 *       500:
 *         description: Server error
 */

router.post('/', verifyToken, createRole);
router.get('/', verifyToken, getRolesByTenant);

module.exports = router;