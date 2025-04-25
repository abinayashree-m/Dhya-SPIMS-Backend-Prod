const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new role
const createRole = async (req, res) => {
  const { tenant_id, name, permissions } = req.body;

  try {
    const role = await prisma.roles.create({
      data: { tenant_id, name, permissions },
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
    const roles = await prisma.roles.findMany({
      where: { tenant_id: tenantId },
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