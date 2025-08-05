const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /buyers
const getAllBuyers = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const buyers = await prisma.buyer.findMany({ 
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' } 
    });
    res.json(buyers);
  } catch (err) {
    console.error('Error fetching buyers:', err);
    res.status(500).json({ error: 'Failed to fetch buyers' });
  }
};

// GET /buyers/:id
const getBuyerById = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const buyer = await prisma.buyer.findFirst({ 
      where: { 
        id: req.params.id,
        tenantId: tenantId
      } 
    });
    if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
    res.json(buyer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch buyer' });
  }
};

// POST /buyers
const createBuyer = async (req, res) => {
  const { name, contact, email, address } = req.body;
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const newBuyer = await prisma.buyer.create({
      data: { 
        name, 
        contact, 
        email, 
        address,
        tenantId: tenantId
      }
    });
    res.status(201).json(newBuyer);
  } catch (err) {
    console.error('Error creating buyer:', err);
    res.status(500).json({ error: 'Failed to create buyer' });
  }
};

// PUT /buyers/:id
const updateBuyer = async (req, res) => {
  const { name, contact, email, address } = req.body;
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const updated = await prisma.buyer.update({
      where: { 
        id: req.params.id,
        tenantId: tenantId
      },
      data: { name, contact, email, address }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update buyer' });
  }
};

// DELETE /buyers/:id
const deleteBuyer = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await prisma.buyer.delete({ 
      where: { 
        id: req.params.id,
        tenantId: tenantId
      } 
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete buyer' });
  }
};

module.exports = {
  getAllBuyers,
  getBuyerById,
  createBuyer,
  updateBuyer,
  deleteBuyer
};