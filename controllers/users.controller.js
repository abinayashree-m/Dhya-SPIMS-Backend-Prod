const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const getAllUsers = async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true, // legacy role field
      is_active: true,
      created_at: true,
      user_roles: {
        include: { role: true }
      }
    }
  });
  res.json(users);
};

const getUserById = async (req, res) => {
  const user = await prisma.users.findUnique({
    where: { id: req.params.id },
    include: {
      user_roles: {
        include: { role: true }
      }
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

const createUser = async (req, res) => {
  const { name, email, password, tenant_id, role_id } = req.body;

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const hash = await bcrypt.hash(password, 10);

  try {
    // Step 1: Create user
    const user = await prisma.users.create({
      data: {
        name,
        email,
        password_hash: hash,
        tenant_id,
      }
    });

    // Step 2: Assign role to user (user_roles table)
    if (role_id) {
      await prisma.user_roles.create({
        data: {
          user_id: user.id,
          role_id
        }
      });
    }

    // Step 3: Return clean user data
    const { password_hash, ...userData } = user;
    const userWithRole = await prisma.users.findUnique({
      where: { id: user.id },
      include: {
        user_roles: {
          include: { role: true }
        }
      }
    });

    res.status(201).json(userWithRole);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, is_active, role } = req.body; // ✅ destructure only valid fields

  try {
    const updated = await prisma.users.update({
      where: { id },
      data: {
        name,
        email,
        is_active,
        role, // ✅ only assign scalar fields
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  await prisma.users.update({
    where: { id: req.params.id },
    data: { is_active: false }
  });
  res.json({ message: 'User deactivated' });
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};