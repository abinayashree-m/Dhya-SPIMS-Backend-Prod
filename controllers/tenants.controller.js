const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllTenants = async (req, res) => {
  const tenants = await prisma.tenants.findMany();
  res.json(tenants);
};

const getTenantById = async (req, res) => {
  const tenant = await prisma.tenants.findUnique({ where: { id: req.params.id } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant);
};

const createTenant = async (req, res) => {
  const { name, domain } = req.body;

  const existing = await prisma.tenants.findFirst({ where: { domain } });
  if (existing) return res.status(409).json({ error: 'Tenant with this domain already exists' });

  const tenant = await prisma.tenants.create({
    data: {
      name,
      domain,
      plan: 'free'
    }
  });

  res.status(201).json(tenant);
};

const updateTenant = async (req, res) => {
  const updated = await prisma.tenants.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(updated);
};

const deactivateTenant = async (req, res) => {
  await prisma.tenants.update({
    where: { id: req.params.id },
    data: { is_active: false }
  });
  res.json({ message: 'Tenant deactivated' });
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deactivateTenant
};