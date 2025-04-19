const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllYarns = async (req, res) => {
  try {
    const yarns = await prisma.yarns.findMany({
      include: {
        yarn_types: true,
        blends: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(yarns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch yarns' });
  }
};

const getYarnById = async (req, res) => {
  try {
    const yarn = await prisma.yarns.findUnique({
      where: { id: req.params.id },
      include: {
        yarn_types: true,
        blends: true
      }
    });
    if (!yarn) return res.status(404).json({ error: 'Yarn not found' });
    res.json(yarn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch yarn' });
  }
};

const createYarn = async (req, res) => {
  const {
    tenant_id,
    yarn_type_id,
    blend_id,
    count_range,
    base_shade,
    special_effect
  } = req.body;

  try {
    const yarn = await prisma.yarns.create({
      data: {
        tenant_id,
        yarn_type_id,
        blend_id,
        count_range,
        base_shade,
        special_effect,
        status: 'active'
      }
    });
    res.status(201).json(yarn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create yarn' });
  }
};

const updateYarn = async (req, res) => {
  try {
    const updated = await prisma.yarns.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update yarn' });
  }
};

const deactivateYarn = async (req, res) => {
  try {
    await prisma.yarns.update({
      where: { id: req.params.id },
      data: { status: 'inactive' }
    });
    res.json({ message: 'Yarn marked inactive' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate yarn' });
  }
};

module.exports = {
  getAllYarns,
  getYarnById,
  createYarn,
  updateYarn,
  deactivateYarn
};