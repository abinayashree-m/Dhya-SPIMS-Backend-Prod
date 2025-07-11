const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllTenants = async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        plan: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Exclude logo from list view for performance
      }
    });
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

const getTenantById = async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ 
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        domain: true,
        plan: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Exclude logo from basic view
      }
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
};

const getTenantDetails = async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ 
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        domain: true,
        plan: true,
        isActive: true,
        logo: true, // Include logo in details view
        createdAt: true,
        updatedAt: true,
      }
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant details:', error);
    res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
};

const createTenant = async (req, res) => {
  try {
    const { name, domain, plan, logo } = req.body;

    // Check if tenant with this domain already exists
    const existing = await prisma.tenant.findFirst({ where: { domain } });
    if (existing) {
      return res.status(409).json({ error: 'Tenant with this domain already exists' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        domain,
        plan: plan || 'free',
        logo: logo || null,
      }
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
};

const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
};

const updateTenantLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const { logo } = req.body;
    
    // Validate that logo is provided
    if (!logo) {
      return res.status(400).json({ error: 'Logo data is required' });
    }
    
    // Basic validation for base64 data
    if (typeof logo !== 'string') {
      return res.status(400).json({ error: 'Logo must be a base64 string' });
    }
    
    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: { 
        logo: logo,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        logo: true,
        updatedAt: true
      }
    });

    res.json({ 
      message: 'Tenant logo updated successfully', 
      tenant: updated 
    });
  } catch (error) {
    console.error('Error updating tenant logo:', error);
    res.status(500).json({ error: 'Failed to update tenant logo' });
  }
};

const deactivateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await prisma.tenant.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Tenant deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating tenant:', error);
    res.status(500).json({ error: 'Failed to deactivate tenant' });
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  getTenantDetails,
  createTenant,
  updateTenant,
  updateTenantLogo,
  deactivateTenant
};