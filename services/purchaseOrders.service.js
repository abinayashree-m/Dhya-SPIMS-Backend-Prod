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

  return await prisma.purchaseOrder.findMany({
    where: { tenantId: user.tenantId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
};

exports.getById = async (id, user) => {
  return await prisma.purchaseOrder.findFirst({
    where: {
      id,
      tenantId: user.tenantId,
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

  return await prisma.purchaseOrder.create({
    data: {
      tenantId: user.tenantId,
      createdBy: user.id,
      status: 'uploaded',
      poNumber: po_number,
      buyerName: buyer_name,
      buyerContactName: buyer_contact_name,
      buyerContactPhone: buyer_contact_phone,
      buyerEmail: buyer_email,
      buyerAddress: buyer_address,
      buyerGstNo: buyer_gst_no,
      buyerPanNo: buyer_pan_no,
      supplierName: supplier_name,
      supplierGstNo: supplier_gst_no,
      paymentTerms: payment_terms,
      styleRefNo: style_ref_no,
      deliveryAddress: delivery_address,
      taxDetails: tax_details,
      grandTotal: grand_total,
      amountInWords: amount_in_words,
      notes,
      poDate: new Date(po_date),
      items: {
        create: items.map((item) => ({
          orderCode: item.order_code,
          yarnDescription: item.yarn_description,
          color: item.color,
          count: item.count,
          uom: item.uom,
          bagCount: item.bag_count,
          quantity: item.quantity,
          rate: item.rate,
          gstPercent: item.gst_percent,
          taxableAmount: item.taxable_amount,
          shadeNo: item.shade_no,
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
  await prisma.purchaseOrderItem.deleteMany({
    where: { purchaseOrderId: id },
  });

  return await prisma.purchaseOrder.update({
    where: { id },
    data: {
      poNumber: po_number,
      buyerName: buyer_name,
      paymentTerms: payment_terms,
      notes,
      amountInWords: amount_in_words,
      grandTotal: grand_total,
      items: {
        create: items.map((item) => ({
          orderCode: item.order_code,
          yarnDescription: item.yarn_description,
          color: item.color,
          uom: item.uom,
          bagCount: item.bag_count,
          quantity: item.quantity,
          rate: item.rate,
          gstPercent: item.gst_percent,
          taxableAmount: item.taxable_amount,
          shadeNo: item.shade_no,
        })),
      },
    },
    include: {
      items: true,
    },
  });
};

exports.remove = async (id) => {
  await prisma.purchaseOrderItem.deleteMany({
    where: { purchaseOrderId: id },
  });

  return await prisma.purchaseOrder.delete({
    where: { id },
  });
};

// ✅ Mark PO as verified
exports.verify = async (id, user) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true }
    });

    if (!existing) {
      throw new Error('Purchase Order not found or access denied.');
    }

    if (existing.status === 'verified') {
      throw new Error('Purchase Order is already verified.');
    }

    if (!existing.buyerName) {
      throw new Error('Purchase Order is missing buyer information.');
    }

    // Create or find buyer
    let buyer = await prisma.buyer.findFirst({
      where: {
        name: existing.buyerName,
        email: existing.buyerEmail
      }
    });

    if (!buyer) {
      buyer = await prisma.buyer.create({
        data: {
          name: existing.buyerName,
          contact: existing.buyerContactPhone,
          email: existing.buyerEmail,
          address: existing.buyerAddress
        }
      });
    }

    // Find or create a default shade
    let shade = await prisma.shade.findFirst({
      where: {
        shadeCode: existing.items[0]?.shadeNo || 'DEFAULT',
        tenantId: user.tenantId
      }
    });

    if (!shade) {
      shade = await prisma.shade.create({
        data: {
          shadeCode: existing.items[0]?.shadeNo || 'DEFAULT',
          shadeName: existing.items[0]?.shadeNo || 'Default Shade',
          tenantId: user.tenantId
        }
      });
    }

    // Create a new sales order
    const order = await prisma.order.create({
      data: {
        orderNumber: `SO-${Date.now()}`,
        buyerId: buyer.id,
        shadeId: shade.id,
        deliveryDate: existing.poDate || new Date(),
        quantity: existing.items.reduce((sum, item) => sum + Number(item.quantity), 0),
        unitPrice: 0,
        totalAmount: 0,
        status: 'pending',
        tenantId: user.tenantId,
      },
    });

    // Update PO status and link to SO
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'verified',
        linkedSalesOrderId: order.id,
      },
      include: {
        items: true,
      },
    });

    // Send email if buyer has an email address
    if (existing.buyerEmail) {
      try {
        await sendPOAuthorizationEmail({
          to: existing.buyerEmail,
          buyerName: existing.buyerName,
          poNumber: existing.poNumber,
          soNumber: order.orderNumber,
          tenant_id: user.tenantId,
          items: existing.items,
          poDate: existing.poDate,
          deliveryDate: order.deliveryDate,
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
  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { items: true }
  });

  if (!existing) {
    throw new Error('Purchase Order not found or access denied.');
  }

  // 🔄 Find / create buyer
  let buyer = existing.buyerId
    ? await prisma.buyer.findUnique({ where: { id: existing.buyerId } })
    : await prisma.buyer.findFirst({
        where: {
          name: existing.buyerName,
          email: existing.buyerEmail,
        },
      });

  if (!buyer) {
    buyer = await prisma.buyer.create({
      data: {
        name: existing.buyerName || 'Default Buyer',
        contact: existing.buyerContactPhone,
        email: existing.buyerEmail,
        address: existing.buyerAddress,
      },
    });
  }

  // 🔄 Find / create shade
  let shade = data.shade_id
    ? await prisma.shade.findUnique({ where: { id: data.shade_id } })
    : await prisma.shade.findFirst({
        where: {
          shadeCode: existing.items[0]?.shadeNo || 'DEFAULT',
          tenantId: user.tenantId,
        },
      });

  if (!shade) {
    shade = await prisma.shade.create({
      data: {
        shadeCode: existing.items[0]?.shadeNo || 'DEFAULT',
        shadeName: existing.items[0]?.shadeNo || 'Default Shade',
        tenantId: user.tenantId,
      },
    });
  }

  // Create a new sales order
  const order = await prisma.order.create({
    data: {
      orderNumber: `SO-${Date.now()}`,
      buyerId: buyer.id,
      shadeId: shade.id,
      deliveryDate: existing.poDate || new Date(),
      quantity: existing.items.reduce((sum, item) => sum + Number(item.quantity), 0),
      unitPrice: 0,
      totalAmount: 0,
      status: 'pending',
      tenantId: user.tenantId,
    },
  });

  // Update PO status and link to SO
  const updatedPO = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: 'verified',
      linkedSalesOrderId: order.id,
    },
    include: {
      items: true,
    },
  });

  // Send email if buyer has an email address
  if (existing.buyerEmail) {
    try {
      await sendPOAuthorizationEmail({
        to: existing.buyerEmail,
        buyerName: existing.buyerName,
        poNumber: existing.poNumber,
        soNumber: order.orderNumber,
        tenant_id: user.tenantId,
        items: existing.items,
        poDate: existing.poDate,
        deliveryDate: order.deliveryDate,
      });
    } catch (error) {
      console.error('Failed to send PO authorization email:', error);
      // Don't throw the error - we don't want to fail the PO conversion if email fails
    }
  }

  return updatedPO;
};