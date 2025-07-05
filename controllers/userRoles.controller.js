const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new role
const createRole = async (req, res) => {
  const { tenantId, name, permissions } = req.body;

  try {
    const role = await prisma.role.create({
      data: { tenantId, name },
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
};

// List roles by tenant
const getRolesByTenant = async (req, res) => {
  const { tenantId } = req.query;

  try {
    const roles = await prisma.role.findMany({
      where: { tenantId: tenantId },
    });

    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

module.exports = {
  createRole,
  getRolesByTenant,
};