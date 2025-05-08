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
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
};

const getAllOrders = async (req, res) => {
  const tenant_id = req.user?.tenantId;
  if (!tenant_id) return res.status(401).json({ error: 'Unauthorized: tenant_id not found in token' });

  try {
    const orders = await orderService.getAllOrders(tenant_id);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Error fetching order by ID:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

const createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body);

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
  } catch (err) {
    console.error('Error creating order:', err);
    const code = err.message === 'Order number already exists' ? 409 : 500;
    res.status(code).json({ error: err.message });
  }
};

const updateOrder = async (req, res) => {
  try {
    const updated = await orderService.updateOrder(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'in_progress', 'dispatched', 'completed'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updated = await orderService.updateOrderStatus(req.params.id, status);
    res.json(updated);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    await orderService.deleteOrder(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};

const getOrderProgressDetails = async (req, res) => {
  try {
    const result = await orderService.getOrderProgressDetails(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Error getting progress details:', err);
    res.status(500).json({ error: 'Failed to fetch order progress' });
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