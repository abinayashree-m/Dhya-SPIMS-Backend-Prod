const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllBrands = async (req, res) => {
  const brands = await prisma.brands.findMany();
  res.json(brands);
};

const getBrandById = async (req, res) => {
  const brand = await prisma.brands.findUnique({
    where: { id: req.params.id }
  });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json(brand);
};

const createBrand = async (req, res) => {
  const { name, type, description } = req.body;

  const brand = await prisma.brands.create({
    data: { name, type, description }
  });

  res.status(201).json(brand);
};

const updateBrand = async (req, res) => {
  const updated = await prisma.brands.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(updated);
};

const deleteBrand = async (req, res) => {
  await prisma.brands.delete({ where: { id: req.params.id } });
  res.json({ message: 'Brand deleted' });
};

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand
};