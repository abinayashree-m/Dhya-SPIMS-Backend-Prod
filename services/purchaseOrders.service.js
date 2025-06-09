const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

const prisma = new PrismaClient();

exports.parseFileAndCreate = async (file, user) => {
  const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'https://dharsan99--dhya-po-parser-fastapi-app.modal.run/parse-pdf/';
  
  const formData = new FormData();
  formData.append('file', file.buffer, { filename: file.originalname });

  let parsedData;
  try {
    console.log(`[Node.js DEBUG] 🧠 Calling Python AI service at ${PYTHON_AI_SERVICE_URL}`);
    const response = await axios.post(PYTHON_AI_SERVICE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('[Node.js DEBUG] ✅ AI Service returned a successful response (200 OK). Data:', JSON.stringify(response.data, null, 2));

    parsedData = response.data.po_data;
    if (!parsedData || !parsedData.poNumber) {
        throw new Error('AI service returned success, but the parsed data is invalid or missing a PO Number.');
    }
  } catch (error) {
    console.error('❌ [Node.js DEBUG] Failed to get a valid response from Python AI service.');
    
    if (error.response) {
      console.error('[Node.js DEBUG] 🚨 Error Status:', error.response.status);
      console.error('[Node.js DEBUG] 🚨 Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('[Node.js DEBUG] 🚨 No response received from AI service:', error.request);
    } else {
      console.error('[Node.js DEBUG] 🚨 Error setting up request:', error.message);
    }
    
    throw new Error('Could not parse document with AI service.');
  }

  // Parse date from DD/MM/YYYY format
  let poDate;
  if (parsedData.poDate) {
    const [day, month, year] = parsedData.poDate.split('/');
    poDate = new Date(year, month - 1, day); // month is 0-based in JS
  } else {
    poDate = new Date(); // fallback to current date
  }

  const createPayload = {
    po_number: parsedData.poNumber || 'N/A',
    po_date: poDate,
    buyer_name: parsedData.buyerName || 'N/A',
    buyer_contact_name: parsedData.buyerContactName || '',
    buyer_contact_phone: parsedData.buyerContactPhone || '',
    buyer_email: parsedData.buyerEmail || '',
    buyer_address: parsedData.buyerAddress || '',
    buyer_gst_no: parsedData.buyerGstNo || '',
    buyer_pan_no: parsedData.buyerPanNo || '',
    supplier_name: parsedData.supplierName || '',
    supplier_gst_no: parsedData.supplierGstNo || '',
    payment_terms: parsedData.paymentTerms || '',
    style_ref_no: parsedData.styleRefNo || '',
    delivery_address: parsedData.deliveryAddress || '',
    tax_details: parsedData.taxDetails || {
      cgst: 0,
      igst: 0,
      sgst: 0,
      round_off: 0
    },
    grand_total: parsedData.grandTotal || 0,
    amount_in_words: parsedData.amountInWords || '',
    notes: parsedData.notes || '',
    items: (parsedData.items || []).map(item => ({
      order_code: item.orderCode || '',
      yarn_description: item.yarnDescription || '',
      color: item.color || '',
      count: item.count || 0,
      uom: item.uom || 'KGS',
      bag_count: item.bagCount || 0,
      quantity: item.quantity || 0,
      rate: item.rate || 0,
      gst_percent: item.gstPercent || 0,
      taxable_amount: item.taxableAmount || 0,
      shade_no: item.shadeNo || ''
    }))
  };

  console.log('💾 Saving parsed data to database...');
  return await exports.create(createPayload, user);
};


exports.getAll = async (user) => {
  if (!user || !user.tenantId) {
    console.warn('⚠️ Missing user or tenantId in getAll');
    return [];
  }

  return await prisma.purchase_orders.findMany({
    where: { tenant_id: user.tenantId },
    include: { items: true },
    orderBy: { created_at: 'desc' },
  });
};

exports.getById = async (id, user) => {
  return await prisma.purchase_orders.findFirst({
    where: {
      id,
      tenant_id: user.tenantId,
    },
    include: {
      items: true,
    },
  });
};

exports.create = async (data, user) => {
  const {
    po_number,
    buyer_name,
    buyer_contact_name,
    buyer_contact_phone,
    buyer_email,
    buyer_address,
    buyer_gst_no,
    buyer_pan_no,
    supplier_name,
    supplier_gst_no,
    payment_terms,
    style_ref_no,
    delivery_address,
    tax_details,
    grand_total,
    amount_in_words,
    notes,
    po_date,
    items = [],
  } = data;

  return await prisma.purchase_orders.create({
    data: {
      tenant_id: user.tenantId,
      created_by: user.id,
      status: 'uploaded',
      po_number,
      buyer_name,
      buyer_contact_name,
      buyer_contact_phone,
      buyer_email,
      buyer_address,
      buyer_gst_no,
      buyer_pan_no,
      supplier_name,
      supplier_gst_no,
      payment_terms,
      style_ref_no,
      delivery_address,
      tax_details,
      grand_total,
      amount_in_words,
      notes,
      po_date: new Date(po_date),
      items: {
        create: items.map((item) => ({
          order_code: item.order_code,
          yarn_description: item.yarn_description,
          color: item.color,
          count: item.count,
          uom: item.uom,
          bag_count: item.bag_count,
          quantity: item.quantity,
          rate: item.rate,
          gst_percent: item.gst_percent,
          taxable_amount: item.taxable_amount,
          shade_no: item.shade_no,
        })),
      },
    },
    include: {
      items: true,
    },
  });
};

exports.update = async (id, data) => {
  const {
    po_number,
    buyer_name,
    payment_terms,
    notes,
    amount_in_words,
    grand_total,
    items = [],
  } = data;

  // Delete existing items
  await prisma.purchase_order_items.deleteMany({
    where: { purchase_order_id: id },
  });

  return await prisma.purchase_orders.update({
    where: { id },
    data: {
      po_number,
      buyer_name,
      payment_terms,
      notes,
      amount_in_words,
      grand_total,
      items: {
        create: items.map((item) => ({
          order_code: item.order_code,
          yarn_description: item.yarn_description,
          color: item.color,
          uom: item.uom,
          bag_count: item.bag_count,
          quantity: item.quantity,
          rate: item.rate,
          gst_percent: item.gst_percent,
          taxable_amount: item.taxable_amount,
          shade_no: item.shade_no,
        })),
      },
    },
    include: {
      items: true,
    },
  });
};

exports.remove = async (id) => {
  await prisma.purchase_order_items.deleteMany({
    where: { purchase_order_id: id },
  });

  return await prisma.purchase_orders.delete({
    where: { id },
  });
};

// ✅ Mark PO as verified
exports.verify = async (id, user) => {
  const existing = await prisma.purchase_orders.findFirst({
    where: { id, tenant_id: user.tenantId },
  });

  if (!existing) {
    throw new Error('Purchase Order not found or access denied.');
  }

  return await prisma.purchase_orders.update({
    where: { id },
    data: {
      status: 'verified',
    },
  });
};

// ✅ Convert PO → SO
exports.convertToSalesOrder = async (poId, user, data) => {
  console.log('🔍 Starting PO to SO conversion...');
  console.log('📦 PO ID:', poId);
  console.log('👤 User:', JSON.stringify(user, null, 2));
  console.log('📝 Conversion Data:', JSON.stringify(data, null, 2));

  const po = await prisma.purchase_orders.findFirst({
    where: {
      id: poId,
      tenant_id: user.tenantId,
      status: 'verified',
    },
    include: { items: true },
  });

  console.log('📄 Found PO:', JSON.stringify(po, null, 2));

  if (!po) throw new Error('Verified Purchase Order not found');

  const shade = await prisma.shades.findFirst({
    where: { id: data.shade_id }
  });
  
  const buyer = await prisma.buyers.findFirst({
    where: {
      id: data.buyer_id
    },
  });

  console.log('🎨 Found Shade:', JSON.stringify(shade, null, 2));
  console.log('👥 Found Buyer:', JSON.stringify(buyer, null, 2));

  if (!shade || !buyer) throw new Error('Missing required shade or buyer');

  const totalQty = po.items.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
  console.log('📊 Total Quantity:', totalQty);

  const newSO = await prisma.orders.create({
    data: {
      id: uuidv4(),
      order_number: `SO-${Math.floor(Math.random() * 1000000)}`,
      buyer_id: buyer.id,
      shade_id: shade.id,
      delivery_date: new Date(data.delivery_date),
      quantity_kg: data.quantity_kg,
      status: 'in_progress',
      tenant_id: user.tenantId,
      created_by: user.id,
    },
  });

  console.log('✅ Created Sales Order:', JSON.stringify(newSO, null, 2));

  await prisma.purchase_orders.update({
    where: { id: poId },
    data: {
      status: 'converted',
      linked_sales_order_id: newSO.id,
    },
  });

  return newSO;
};