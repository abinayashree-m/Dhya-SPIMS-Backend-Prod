const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId: req.user.tenantId
      },
    select: {
      id: true,
      name: true,
      email: true,
      role: true, // legacy role field
        isActive: true,
        createdAt: true,
        userRoles: {
          include: { 
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
      }
    }
  });
    
    // Transform the response to include role information in a consistent format
    const transformedUsers = users.map(user => ({
      ...user,
      // If user has userRoles, use the first role name, otherwise use legacy role
      primaryRole: user.userRoles.length > 0 ? user.userRoles[0].role.name : user.role,
      roleDetails: user.userRoles.length > 0 ? user.userRoles[0].role : null
    }));
    
    res.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getUserById = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      userRoles: {
        include: { role: true }
      }
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

const createUser = async (req, res) => {
  const { name, email, password, tenantId, roleId } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const hash = await bcrypt.hash(password, 10);

  try {
    // Step 1: Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        tenantId,
      }
    });

    // Step 2: Assign role to user (userRoles table)
    if (roleId) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId
        }
      });
    }

    // Step 3: Return clean user data
    const { passwordHash, ...userData } = user;
    const userWithRole = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
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
  const { name, email, isActive, role } = req.body; // ✅ destructure only valid fields

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        isActive,
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
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false }
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