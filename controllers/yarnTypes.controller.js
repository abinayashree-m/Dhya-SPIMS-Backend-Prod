const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllYarnTypes = async (req, res) => {
  try {
    const types = await prisma.yarn_types.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch yarn types' });
  }
};

const getYarnTypeById = async (req, res) => {
  try {
    const type = await prisma.yarn_types.findUnique({
      where: { id: req.params.id }
    });
    if (!type) return res.status(404).json({ error: 'Yarn type not found' });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving yarn type' });
  }
};

const createYarnType = async (req, res) => {
  const { name, category } = req.body;

  try {
    const type = await prisma.yarn_types.create({
      data: { name, category }
    });
    res.status(201).json(type);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create yarn type' });
  }
};

const updateYarnType = async (req, res) => {
  try {
    const updated = await prisma.yarn_types.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update yarn type' });
  }
};

const deleteYarnType = async (req, res) => {
  try {
    await prisma.yarn_types.delete({ where: { id: req.params.id } });
    res.json({ message: 'Yarn type deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete yarn type' });
  }
};

module.exports = {
  getAllYarnTypes,
  getYarnTypeById,
  createYarnType,
  updateYarnType,
  deleteYarnType
};