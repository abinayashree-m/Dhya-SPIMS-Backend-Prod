const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Assign or update a user's role
const assignRoleToUser = async (req, res) => {
  const { userId, roleId } = req.body;

  try {
    const result = await prisma.userRole.upsert({
      where: { 
        userId_roleId: {
          userId: userId,
          roleId: roleId
        }
      },
      update: {},
      create: { userId: userId, roleId: roleId },
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
};

// Get a user’s assigned role
const getUserRole = async (req, res) => {
  const { userId } = req.params;

  try {
    const role = await prisma.userRole.findFirst({
      where: { userId: userId },
      include: { role: true },
    });

    if (!role) return res.status(404).json({ error: 'Role not found for user' });

    res.json(role);
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ error: 'Failed to fetch user role' });
  }
};

module.exports = {
  assignRoleToUser,
  getUserRole,
};