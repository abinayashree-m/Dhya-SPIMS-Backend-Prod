const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.suppliers.findMany();
    res.status(200).json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
};

const createSupplier = async (req, res) => {
  const { name, contact, email, address } = req.body;
  try {
    const newSupplier = await prisma.suppliers.create({
      data: { name, contact, email, address },
    });
    res.status(201).json(newSupplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier.' });
  }
};

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
    res.status(500).json({ error: 'Failed to update supplier.' });
  }
};

const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.suppliers.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete supplier.' });
  }
};

module.exports = {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};