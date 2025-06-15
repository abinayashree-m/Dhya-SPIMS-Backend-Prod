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
    const orders = await orderService.getAllOrders(req.user.tenantId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id, req.user.tenantId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

const createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body, req.user.tenantId);

    // 🔁 Fetch buyer and shade info for email
    const [buyer, shade] = await Promise.all([
      prisma.buyers.findUnique({ where: { id: order.buyer_id } }),
      prisma.shades.findUnique({
        where: { id: order.shade_id },
        include: { raw_cotton_composition: true },
      }),
    ]);

    // ✉️ Trigger email
    if (buyer?.email) {
      await sendOrderConfirmationEmail({
        to: buyer.email,
        buyerName: buyer.name,
        orderNumber: order.order_number,
        count: order.count,
        quantity: order.quantity_kg,
        tenant_id: order.tenant_id,
        shadeCode: shade?.shade_code ?? '-',
        orderDate: order.created_at,
        deliveryDate: order.delivery_date,
        cc: ['dharsan@dhya.in'],
        reply_to: ['support@dhya.in'],
      });
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!isUUID(id)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    // Validate required fields
    const { buyer_id, shade_id, quantity_kg, delivery_date } = req.body;
    if (buyer_id && !isUUID(buyer_id)) {
      return res.status(400).json({ error: 'Invalid buyer ID format' });
    }
    if (shade_id && !isUUID(shade_id)) {
      return res.status(400).json({ error: 'Invalid shade ID format' });
    }
    if (quantity_kg !== undefined && (isNaN(quantity_kg) || Number(quantity_kg) <= 0)) {
      return res.status(400).json({ error: 'Invalid quantity value' });
    }
    if (delivery_date && isNaN(Date.parse(delivery_date))) {
      return res.status(400).json({ error: 'Invalid delivery date format' });
    }

    const order = await orderService.updateOrder(id, req.body, req.user.tenantId);
    res.json(order);
  } catch (error) {
    console.error('Order update error:', error);
    if (error.message === 'Order not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid') || error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update order: ' + error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(id, status, req.user.tenantId);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await orderService.deleteOrder(id, req.user.tenantId);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
};

const getOrderProgressDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const progress = await orderService.getProgressDetails(id, req.user.tenantId);
    res.json(progress);
  } catch (error) {
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