const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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