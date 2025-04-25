const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/users.controller');

const { verifyToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management routes
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', verifyToken, getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User object
 */
router.get('/:id', verifyToken, getUserById);
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user and assign a role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, tenant_id]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jaya Kumar
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jaya@dhya.in
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secure@123
 *               tenant_id:
 *                 type: string
 *                 format: uuid
 *                 example: d9f2a1a0-3c7e-4a0c-9b79-2fc9c81c3035
 *               role_id:
 *                 type: string
 *                 format: uuid
 *                 example: 3b12f1d9-ff11-41f1-8cce-b0e531f3e00a
 *     responses:
 *       201:
 *         description: User created successfully
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Internal server error
 */
router.post('/', verifyToken, createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user info
 *     tags: [Users]
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
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', verifyToken, updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Deactivate user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.delete('/:id', verifyToken, deleteUser);

module.exports = router;