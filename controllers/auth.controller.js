const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt.util');
const prisma = new PrismaClient();

const login = async (req, res) => {
  console.log('\n[Auth] /login invoked');
  const { email, password } = req.body;
  const debug = process.env.DEBUG_AUTH === 'true';
  if (debug) {
    console.log('[Auth] Payload:', { email, passwordProvided: !!password });
    console.log('[Auth] Plaintext password from client:', password);
  }

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

  console.log('[Auth] User lookup result:', user ? {
    id: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    is_active: user.is_active,
    roleCount: user.user_roles?.length || 0,
  } : 'NOT_FOUND');

  if (!user) {
    console.warn('[Auth] Login failed – user not found for email:', email);
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (debug) {
    console.log('[Auth] Password check:', { isValid });
    console.log('[Auth] Stored password hash (bcrypt):', user.password_hash);
  }

  if (!isValid) {
    console.warn('[Auth] Login failed – invalid password for user:', user.id);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (debug) console.log('[Auth] Credentials valid – generating token...');

  // Merge permissions
  const mergedPermissions = {};
  for (const ur of user.user_roles) {
    const rolePerms = ur.role?.permissions || {};
    for (const [module, actions] of Object.entries(rolePerms)) {
      if (!mergedPermissions[module]) mergedPermissions[module] = new Set();
      actions.forEach(action => mergedPermissions[module].add(action));
    }
  }

  // Convert Sets back to arrays
  for (const module in mergedPermissions) {
    mergedPermissions[module] = Array.from(mergedPermissions[module]);
  }

  const token = generateToken({
    id: user.id,
    role: user.role,
    tenant_id: user.tenant_id,
    email: user.email
  });

  const { password_hash, ...userData } = user;
  res.json({
    user: {
      ...userData,
      permissions: mergedPermissions
    },
    token
  });

  if (debug) console.log('[Auth] Login successful for user:', user.id);
};

module.exports = { login };
