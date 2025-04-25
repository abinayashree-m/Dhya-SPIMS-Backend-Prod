const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Assign or update a user's role
const assignRoleToUser = async (req, res) => {
  const { user_id, role_id } = req.body;

  try {
    const result = await prisma.user_roles.upsert({
      where: { user_id },
      update: { role_id },
      create: { user_id, role_id },
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
    const role = await prisma.user_roles.findUnique({
      where: { user_id: userId },
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