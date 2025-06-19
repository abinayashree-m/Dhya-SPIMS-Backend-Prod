const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { sendPOAuthorizationEmail } = require('../utils/email');

const prisma = new PrismaClient();

exports.parseFileAndCreate = async (file, user) => {
  const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'https://dharsan99--dhya-po-parser-fastapi-app.modal.run/parse-pdf/';
  
  const formData = new FormData();
  formData.append('file', file.buffer, { filename: file.originalname });

  let parsedData;
  try {
    const response = await axios.post(PYTHON_AI_SERVICE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    parsedData = response.data.po_data;
    if (!parsedData || !parsedData.poNumber) {
        throw new Error('AI service returned success, but the parsed data is invalid or missing a PO Number.');
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400) {
        throw new Error('AI service returned 400 Bad Request. Please check the file format.');
      }
    } else if (error.request) {
      throw new Error('AI service request failed. Please check your internet connection.');
    } else {
      throw new Error('AI service setup failed. Please try again later.');
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

  return await exports.create(createPayload, user);
};


exports.getAll = async (user) => {
  if (!user || !user.tenantId) {
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
  try {
    const existing = await prisma.purchase_orders.findFirst({
      where: { id, tenant_id: user.tenantId },
      include: { items: true }
    });

    if (!existing) {
      throw new Error('Purchase Order not found or access denied.');
    }

    if (existing.status === 'verified') {
      throw new Error('Purchase Order is already verified.');
    }

    if (!existing.buyer_name) {
      throw new Error('Purchase Order is missing buyer information.');
    }

    // Create or find buyer
    let buyer = await prisma.buyers.findFirst({
      where: {
        name: existing.buyer_name,
        email: existing.buyer_email
      }
    });

    if (!buyer) {
      buyer = await prisma.buyers.create({
        data: {
          name: existing.buyer_name,
          contact: existing.buyer_contact_phone,
          email: existing.buyer_email,
          address: existing.buyer_address
        }
      });
    }

    // Find or create a default shade
    let shade = await prisma.shades.findFirst({
      where: {
        shade_code: existing.items[0]?.shade_no || 'DEFAULT',
        tenant_id: user.tenantId
      }
    });

    if (!shade) {
      shade = await prisma.shades.create({
        data: {
          shade_code: existing.items[0]?.shade_no || 'DEFAULT',
          shade_name: existing.items[0]?.shade_no || 'Default Shade',
          tenant_id: user.tenantId
        }
      });
    }

    // Create a new sales order
    const order = await prisma.orders.create({
      data: {
        order_number: `SO-${Date.now()}`,
        buyer_id: buyer.id,
        shade_id: shade.id,
        delivery_date: existing.po_date || new Date(),
        quantity_kg: existing.items.reduce((sum, item) => sum + Number(item.quantity), 0),
        status: 'pending',
        tenant_id: user.tenantId,
        created_by: user.id,
        count: existing.items[0]?.count || null,
      },
    });

    // Update PO status and link to SO
    const updatedPO = await prisma.purchase_orders.update({
      where: { id },
      data: {
        status: 'verified',
        linked_sales_order_id: order.id,
      },
      include: {
        items: true,
      },
    });

    // Send email if buyer has an email address
    if (existing.buyer_email) {
      try {
        await sendPOAuthorizationEmail({
          to: existing.buyer_email,
          buyerName: existing.buyer_name,
          poNumber: existing.po_number,
          soNumber: order.order_number,
          tenant_id: user.tenantId,
          items: existing.items,
          poDate: existing.po_date,
          deliveryDate: order.delivery_date,
        });
      } catch (error) {
        console.error('Failed to send PO authorization email:', error);
        // Don't throw the error - we don't want to fail the PO verification if email fails
      }
    }

    return updatedPO;
  } catch (error) {
    console.error('Error in verify function:', error);
    throw error;
  }
};

// ✅ Convert PO to Sales Order
exports.convertToSalesOrder = async (id, user, data) => {
  const existing = await prisma.purchase_orders.findFirst({
    where: { id, tenant_id: user.tenantId },
    include: { items: true }
  });

  if (!existing) {
    throw new Error('Purchase Order not found or access denied.');
  }

  // 🔄 Find / create buyer
  let buyer = existing.buyer_id
    ? await prisma.buyers.findUnique({ where: { id: existing.buyer_id } })
    : await prisma.buyers.findFirst({
        where: {
          name: existing.buyer_name,
          email: existing.buyer_email,
        },
      });

  if (!buyer) {
    buyer = await prisma.buyers.create({
      data: {
        name: existing.buyer_name || 'Default Buyer',
        contact: existing.buyer_contact_phone,
        email: existing.buyer_email,
        address: existing.buyer_address,
      },
    });
  }

  // 🔄 Find / create shade
  let shade = data.shade_id
    ? await prisma.shades.findUnique({ where: { id: data.shade_id } })
    : await prisma.shades.findFirst({
        where: {
          shade_code: existing.items[0]?.shade_no || 'DEFAULT',
          tenant_id: user.tenantId,
        },
      });

  if (!shade) {
    shade = await prisma.shades.create({
      data: {
        shade_code: existing.items[0]?.shade_no || 'DEFAULT',
        shade_name: existing.items[0]?.shade_no || 'Default Shade',
        tenant_id: user.tenantId,
      },
    });
  }

  // Create a new sales order
  const order = await prisma.orders.create({
    data: {
      order_number: `SO-${Date.now()}`,
      buyer_id: buyer.id,
      shade_id: shade.id,
      delivery_date: existing.po_date || new Date(),
      quantity_kg: existing.items.reduce((sum, item) => sum + Number(item.quantity), 0),
      status: 'pending',
      tenant_id: user.tenantId,
      created_by: user.id,
      count: existing.items[0]?.count || null,
    },
  });

  // Update PO status and link to SO
  const updatedPO = await prisma.purchase_orders.update({
    where: { id },
    data: {
      status: 'verified',
      linked_sales_order_id: order.id,
    },
    include: {
      items: true,
    },
  });

  // Send email if buyer has an email address
  if (existing.buyer_email) {
    try {
      await sendPOAuthorizationEmail({
        to: existing.buyer_email,
        buyerName: existing.buyer_name,
        poNumber: existing.po_number,
        soNumber: order.order_number,
        tenant_id: user.tenantId,
        items: existing.items,
        poDate: existing.po_date,
        deliveryDate: order.delivery_date,
      });
    } catch (error) {
      console.error('Failed to send PO authorization email:', error);
      // Don't throw the error - we don't want to fail the PO conversion if email fails
    }
  }

  return updatedPO;
};