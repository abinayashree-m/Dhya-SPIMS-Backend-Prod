const express = require('express');
const router = express.Router();
const { assignRoleToUser, getUserRole } = require('../controllers/userRoleAssignments.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: User Role Assignments
 *   description: Manage role assignments for users
 */

/**
 * @swagger
 * /user-role-assignments/assign:
 *   post:
 *     summary: Assign or update a role for a user
 *     tags: [User Role Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - role_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               role_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Role assigned or updated
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /user-role-assignments/{userId}:
 *   get:
 *     summary: Get the role assigned to a user
 *     tags: [User Role Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User role fetched
 *       404:
 *         description: Role not found for user
 *       500:
 *         description: Server error
 */

router.post('/assign', verifyToken, assignRoleToUser);
router.get('/:userId', verifyToken, getUserRole);

module.exports = router;