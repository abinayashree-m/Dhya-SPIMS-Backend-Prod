const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /buyers
const getAllBuyers = async (req, res) => {
  try {
    const buyers = await prisma.buyer.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(buyers);
  } catch (err) {
    console.error('Error fetching buyers:', err);
    res.status(500).json({ error: 'Failed to fetch buyers' });
  }
};

// GET /buyers/:id
const getBuyerById = async (req, res) => {
  try {
    const buyer = await prisma.buyer.findUnique({ where: { id: req.params.id } });
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
    const newBuyer = await prisma.buyer.create({
      data: { name, contact, email, address }
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
    const updated = await prisma.buyer.update({
      where: { id: req.params.id },
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
    await prisma.buyer.delete({ where: { id: req.params.id } });
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