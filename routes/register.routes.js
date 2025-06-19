//pullable request
const express = require('express');
const router = express.Router();
const controller = require('../controllers/register.controller');

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new tenant and admin user (with optional roles)
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
 *               roles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     permissions:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: string
 *     responses:
 *       201:
 *         description: Tenant, admin user, and roles created
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', controller.register);

module.exports = router;
