const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.suppliers.findMany({
      include: {
        fibre_requests: true, // optional: include related restock requests
      },
      orderBy: { created_at: 'desc' },
    });
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('❌ Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
};

// GET a single supplier by ID
const getSupplierById = async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await prisma.suppliers.findUnique({
      where: { id },
      include: {
        fibre_requests: {
          include: {
            fibre: true,
          },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    res.status(200).json(supplier);
  } catch (error) {
    console.error('❌ Error fetching supplier by ID:', error);
    res.status(500).json({ error: 'Failed to fetch supplier.' });
  }
};

// POST create supplier
const createSupplier = async (req, res) => {
  const { name, contact, email, address } = req.body;
  try {
    const newSupplier = await prisma.suppliers.create({
      data: { name, contact, email, address },
    });
    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('❌ Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier.' });
  }
};

// PUT update supplier
const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { name, contact, email, address } = req.body;
  try {
    const updated = await prisma.suppliers.update({
      where: { id },
      data: { name, contact, email, address },
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier.' });
  }
};

// DELETE supplier
const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.suppliers.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier.' });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};