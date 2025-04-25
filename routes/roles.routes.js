const express = require('express');
const router = express.Router();
const { createRole, getRolesByTenant } = require('../controllers/userRoles.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get roles for tenant
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/', verifyToken, getRolesByTenant);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, permissions]
 *             properties:
 *               name: { type: string }
 *               permissions: 
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Role created
 */
router.post('/', verifyToken, createRole);

module.exports = router;