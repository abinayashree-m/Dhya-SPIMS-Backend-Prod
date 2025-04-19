const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt.util');

const prisma = new PrismaClient();

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.users.findUnique({ where: { email } });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken({
    id: user.id,
    role: user.role,
    tenant_id: user.tenant_id // ✅ Include this
  });
  const { password_hash, ...userData } = user;
  res.json({ user: userData, token });
};

module.exports = { login };