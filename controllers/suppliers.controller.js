const suppliersService = require('../services/suppliers.service');

// GET all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await suppliersService.getAllSuppliers();
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('❌ Error in getAllSuppliers controller:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch suppliers.' });
  }
};

// GET a single supplier by ID
const getSupplierById = async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await suppliersService.getSupplierById(id);
    res.status(200).json(supplier);
  } catch (error) {
    console.error('❌ Error in getSupplierById controller:', error);
    if (error.message === 'Supplier not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch supplier.' });
  }
};

// POST create supplier
const createSupplier = async (req, res) => {
  try {
    const newSupplier = await suppliersService.createSupplier(req.body);
    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('❌ Error in createSupplier controller:', error);
    if (error.message === 'Supplier name is required') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to create supplier.' });
  }
};

// PUT update supplier
const updateSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await suppliersService.updateSupplier(id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Error in updateSupplier controller:', error);
    if (error.message === 'Supplier not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update supplier.' });
  }
};

// DELETE supplier
const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    await suppliersService.deleteSupplier(id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error in deleteSupplier controller:', error);
    if (error.message === 'Supplier not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Cannot delete supplier with associated records') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete supplier.' });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};