const xlsx = require('xlsx');
const fs = require('fs');
const orderService = require('../services/orders.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendOrderConfirmationEmail } = require('../utils/email');


const isUUID = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const bulkImportOrders = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const created = [];
  const errors = [];

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2;

      const {
        order_number,
        buyer_id,
        shade_id,
        quantity_kg,
        delivery_date,
        status = 'pending',
        tenant_id,
        realisation,
        count
      } = row;

      // ✅ Validate required fields
      if (!order_number || !buyer_id || !shade_id || !tenant_id || !quantity_kg || !delivery_date) {
        errors.push({ row: rowIndex, reason: 'Missing required fields' });
        continue;
      }

      if (!isUUID(buyer_id)) {
        errors.push({ row: rowIndex, reason: 'Invalid buyer_id UUID' });
        continue;
      }

      if (!isUUID(shade_id)) {
        errors.push({ row: rowIndex, reason: 'Invalid shade_id UUID' });
        continue;
      }

      if (!isUUID(tenant_id)) {
        errors.push({ row: rowIndex, reason: 'Invalid tenant_id UUID' });
        continue;
      }

      if (isNaN(quantity_kg) || Number(quantity_kg) <= 0) {
        errors.push({ row: rowIndex, reason: 'Invalid quantity_kg' });
        continue;
      }

      if (isNaN(Date.parse(delivery_date))) {
        errors.push({ row: rowIndex, reason: 'Invalid delivery_date' });
        continue;
      }

      // ✅ Ensure buyer and shade exist
      const [buyer, shade] = await Promise.all([
        prisma.buyers.findUnique({ where: { id: buyer_id } }),
        prisma.shades.findUnique({ where: { id: shade_id } }),
      ]);

      if (!buyer) {
        errors.push({ row: rowIndex, reason: 'Buyer not found' });
        continue;
      }

      if (!shade) {
        errors.push({ row: rowIndex, reason: 'Shade not found' });
        continue;
      }

      try {
        const order = await orderService.createOrder({
          order_number,
          buyer_id,
          shade_id,
          quantity_kg: Number(quantity_kg),
          delivery_date: new Date(delivery_date),
          status,
          tenant_id,
          realisation: realisation ? parseFloat(realisation) : undefined,
          count: count ? parseInt(count) : undefined
        });

        created.push(order);
      } catch (err) {
        errors.push({ row: rowIndex, reason: `Failed to insert: ${err.message}` });
      }
    }

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: 'Bulk upload complete',
      createdCount: created.length,
      errorCount: errors.length,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';
    
    const result = await orderService.getAllOrders(tenantId, { page, limit, search, status, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const order = await orderService.getOrderById(req.params.id, tenantId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const order = await orderService.createOrder(req.body, tenantId);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateOrder = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const order = await orderService.updateOrder(req.params.id, req.body, tenantId);
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status, tenantId);
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    await orderService.deleteOrder(req.params.id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
};

const getOrderProgressDetails = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const { id } = req.params;
    const progress = await orderService.getProgressDetails(id, tenantId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress details:', error);
    res.status(500).json({ error: 'Failed to fetch progress details' });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  bulkImportOrders,
  getOrderProgressDetails
};