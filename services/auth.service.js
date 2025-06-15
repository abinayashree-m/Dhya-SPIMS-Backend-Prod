const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const authService = {
  async login(email, password) {
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        user_roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        roles: user.user_roles.map(ur => ur.role.name)
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.user_roles.map(ur => ur.role.name)
      }
    };
  }
};

module.exports = authService;
