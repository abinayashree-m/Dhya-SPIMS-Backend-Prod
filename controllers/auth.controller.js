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

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('[Auth] User lookup result:', user ? {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    isActive: user.isActive,
    roleCount: user.userRoles?.length || 0,
  } : 'NOT_FOUND');

  if (!user) {
    console.warn('[Auth] Login failed – user not found for email:', email);
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (debug) {
    console.log('[Auth] Password check:', { isValid });
    console.log('[Auth] Stored password hash (bcrypt):', user.passwordHash);
  }

  if (!isValid) {
    console.warn('[Auth] Login failed – invalid password for user:', user.id);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (debug) console.log('[Auth] Credentials valid – generating token...');

  // Merge permissions from rolePermissions
  const mergedPermissions = {};
  for (const ur of user.userRoles) {
    const rolePermissions = ur.role?.rolePermissions || [];
    for (const rp of rolePermissions) {
      const permission = rp.permission;
      const [module, action] = permission.code.split('.');
      
      // Convert backend format to frontend format
      const moduleMap = {
        'fibres': 'Fibres',
        'shades': 'Shades', 
        'orders': 'Orders',
        'production': 'Production',
        'buyers': 'Buyers',
        'employees': 'Employees',
        'attendance': 'Attendance',
        'suppliers': 'Suppliers',
        'settings': 'Settings',
        'roles': 'Roles',
        'marketing': 'Marketing',
        'users': 'Users',
        'stocks': 'Stocks',
        'purchase_orders': 'Purchase Orders',
        'growth_engine': 'Growth Engine',
        'dashboard': 'Dashboard',
        'reports': 'Reports',
        'system': 'System'
      };
      
      const actionMap = {
        'add': 'Add',
        'update': 'Update', 
        'delete': 'Delete',
        'view': 'View',
        'export': 'Export',
        'full_access': 'Full Access',
        'manage_tenants': 'Manage Tenants',
        'manage_all_users': 'Manage All Users'
      };
      
      const frontendModule = moduleMap[module] || module;
      const frontendAction = actionMap[action] || action;
      
      if (!mergedPermissions[frontendModule]) mergedPermissions[frontendModule] = new Set();
      mergedPermissions[frontendModule].add(frontendAction);
    }
  }

  // Convert Sets back to arrays
  for (const module in mergedPermissions) {
    mergedPermissions[module] = Array.from(mergedPermissions[module]);
  }

  const token = generateToken({
    id: user.id,
    role: user.role,
    tenantId: user.tenantId,
    email: user.email
  });

  const { passwordHash, ...userData } = user;
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
