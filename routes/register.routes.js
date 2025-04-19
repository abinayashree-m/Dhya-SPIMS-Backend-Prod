const express = require('express');
const router = express.Router();
const controller = require('../controllers/register.controller');

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new tenant and admin user
 *     tags: [Register]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantName
 *               - adminName
 *               - email
 *               - password
 *             properties:
 *               tenantName:
 *                 type: string
 *               domain:
 *                 type: string
 *               adminName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tenant and admin user created
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', controller.register);

module.exports = router;