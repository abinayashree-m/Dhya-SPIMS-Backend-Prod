const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all suppliers
const getAllSuppliers = async () => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        fibreRequests: {
          include: {
            fibre: true,
          },
        },
        fibreTransfers: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return suppliers;
  } catch (error) {
    console.error('❌ Error in getAllSuppliers service:', error);
    throw new Error('Failed to fetch suppliers');
  }
};

// Get a single supplier by ID
const getSupplierById = async (id) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        fibreRequests: {
          include: {
            fibre: true,
          },
        },
        fibreTransfers: true,
      },
    });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplier;
  } catch (error) {
    console.error('❌ Error in getSupplierById service:', error);
    throw error;
  }
};

// Create a new supplier
const createSupplier = async (data) => {
  try {
    const { name, contact, email, address } = data;
    
    // Validate required fields
    if (!name) {
      throw new Error('Supplier name is required');
    }

    const newSupplier = await prisma.supplier.create({
      data: {
        name,
        contact,
        email,
        address,
        isActive: true,
      },
    });

    return newSupplier;
  } catch (error) {
    console.error('❌ Error in createSupplier service:', error);
    throw error;
  }
};

// Update an existing supplier
const updateSupplier = async (id, data) => {
  try {
    const { name, contact, email, address, isActive } = data;

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      throw new Error('Supplier not found');
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        contact,
        email,
        address,
        isActive,
        updatedAt: new Date(),
      },
    });

    return updated;
  } catch (error) {
    console.error('❌ Error in updateSupplier service:', error);
    throw error;
  }
};

// Delete a supplier
const deleteSupplier = async (id) => {
  try {
    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        fibreRequests: true,
        fibreTransfers: true,
      },
    });

    if (!existingSupplier) {
      throw new Error('Supplier not found');
    }

    // Check if supplier has any associated records
    if (existingSupplier.fibreRequests.length > 0 || existingSupplier.fibreTransfers.length > 0) {
      throw new Error('Cannot delete supplier with associated records');
    }

    await prisma.supplier.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error('❌ Error in deleteSupplier service:', error);
    throw error;
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
}; 