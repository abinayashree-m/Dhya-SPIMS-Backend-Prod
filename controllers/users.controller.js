const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const getAllUsers = async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true, name: true, email: true, role: true, is_active: true, created_at: true
    }
  });
  res.json(users);
};

const getUserById = async (req, res) => {
  const user = await prisma.users.findUnique({
    where: { id: req.params.id }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

const createUser = async (req, res) => {
  const { name, email, password, role, tenant_id } = req.body;

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.users.create({
    data: {
      name,
      email,
      password_hash: hash,
      role,
      tenant_id
    }
  });

  const { password_hash, ...userData } = user;
  res.status(201).json(userData);
};

const updateUser = async (req, res) => {
  const updated = await prisma.users.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(updated);
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