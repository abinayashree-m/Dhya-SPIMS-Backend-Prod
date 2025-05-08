const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Decimal } = require('@prisma/client/runtime/library');

// 1. Get all orders for a tenant
exports.getAllOrders = async (tenant_id) => {
  return await prisma.orders.findMany({
    where: { tenant_id },
    include: {
      buyer: true,
      shade: {
        include: {
          shade_fibres: {
            include: {
              fibre: true
            }
          },
          raw_cotton_composition: true,
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });
};

// 2. Get order by ID
exports.getOrderById = async (id) => {
  return await prisma.orders.findUnique({
    where: { id },
    include: {
      buyer: true,
      shade: {
        include: {
          shade_fibres: {
            include: {
              fibre: true
            }
          },
          raw_cotton_composition: true,
        }
      }
    }
  });
};

// 3. Create a new order
exports.createOrder = async (data) => {
  const { buyer_id, shade_id, realisation, ...rest } = data;

  const timestamp = Date.now().toString().slice(-6);
  const order_number = `SO-${timestamp}`;

  const existing = await prisma.orders.findUnique({
    where: { order_number },
  });

  if (existing) {
    throw new Error('Order number already exists (race condition)');
  }

  const createdOrder = await prisma.orders.create({
    data: {
      ...rest,
      buyer_id,
      shade_id,
      order_number,
      delivery_date: new Date(data.delivery_date),
      status: data.status || 'pending',
      realisation: realisation ? new Decimal(realisation) : undefined,
      count: data.count !== undefined ? parseInt(data.count) : undefined,
    },
  });

  return await prisma.orders.findUnique({
    where: { id: createdOrder.id },
    include: {
      shade: {
        include: {
          shade_fibres: {
            include: { fibre: true }
          },
          raw_cotton_composition: true,
        }
      },
      buyer: true,
    },
  });
};

// 4. Update full order by ID
exports.updateOrder = async (id, data) => {
  const { raw_cotton_updates, ...updateData } = data;

  if (updateData.delivery_date) {
    const parsedDate = new Date(updateData.delivery_date);
    if (!isNaN(parsedDate)) updateData.delivery_date = parsedDate;
    else delete updateData.delivery_date;
  }

  if (updateData.count !== undefined) {
    updateData.count = parseInt(updateData.count);
  }

  const updatedOrder = await prisma.orders.update({
    where: { id },
    data: updateData,
  });

  if (Array.isArray(raw_cotton_updates)) {
    for (const rc of raw_cotton_updates) {
      if (!rc.id) continue;

      await prisma.raw_cotton_composition.update({
        where: { id: rc.id },
        data: {
          lot_number: rc.lot_number,
          stock_kg: rc.stock_kg ? new Decimal(rc.stock_kg) : undefined,
          grade: rc.grade,
          source: rc.source,
          notes: rc.notes,
        },
      });
    }
  }

  return await prisma.orders.findUnique({
    where: { id },
    include: {
      buyer: true,
      shade: {
        include: {
          shade_fibres: { include: { fibre: true } },
          raw_cotton_composition: true,
        },
      },
    },
  });
};

// 5. Update only the status and handle fibre stock usage logging if moving to in_progress
exports.updateOrderStatus = async (id, status) => {
  const allowed = ['pending', 'in_progress', 'completed'];
  if (!allowed.includes(status)) {
    throw new Error('Invalid status');
  }

  const order = await prisma.orders.findUnique({
    where: { id },
    include: {
      shade: {
        include: {
          shade_fibres: {
            include: { fibre: true },
          },
          raw_cotton_composition: true,
        },
      },
    },
  });

  if (!order) throw new Error('Order not found');

  if (status === 'in_progress') {
    if (!order.realisation) throw new Error('Realisation is required to move to in_progress');

    const totalQty = new Decimal(order.quantity_kg).div(order.realisation).mul(100);

    for (const sf of order.shade.shade_fibres) {
      const requiredKg = totalQty.mul(sf.percentage).div(100);
      const fibre = await prisma.fibres.findUnique({ where: { id: sf.fibre_id } });
      if (!fibre) throw new Error(`Fibre not found: ${sf.fibre_id}`);

      const newStock = new Decimal(fibre.stock_kg).minus(requiredKg);

      await prisma.fibres.update({
        where: { id: sf.fibre_id },
        data: { stock_kg: newStock },
      });

      await prisma.fibre_usage_logs.create({
        data: {
          fibre_id: sf.fibre_id,
          used_kg: requiredKg,
        },
      });
    }
  }

  return await prisma.orders.update({
    where: { id },
    data: { status },
  });
};

// 6. Delete order
exports.deleteOrder = async (id) => {
  return await prisma.orders.delete({
    where: { id }
  });
};

// 7. Get detailed order progress
exports.getOrderProgressDetails = async (orderId) => {
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: {
      shade: {
        include: {
          shade_fibres: {
            include: { fibre: true },
          },
          raw_cotton_composition: true,
        },
      },
    },
  });

  if (!order) throw new Error('Order not found');

  const logs = await prisma.productions.findMany({
    where: { order_id: orderId },
    orderBy: { date: 'asc' },
  });

  const requiredQty = Number(order.quantity_kg);
  const producedQty = logs.reduce((sum, log) => sum + Number(log.production_kg), 0);
  const balanceQty = requiredQty - producedQty;
  const progressPercent = requiredQty > 0 ? (producedQty / requiredQty) * 100 : 0;

  const timeline = logs.map((log) => ({
    date: log.date.toISOString(),
    machine: log.machine,
    section: log.section,
    shift: log.shift,
    production_kg: Number(log.production_kg),
    remarks: log.remarks,
  }));

  const dailyChart = timeline.map((log) => ({
    date: log.date,
    production_kg: log.production_kg,
  }));

  const fiberSummary = [
    ...order.shade.shade_fibres.map((sf) => {
      const required = requiredQty * (sf.percentage / 100);
      return {
        fibre_name: sf.fibre.fibre_name,
        required_qty: required,
        actual_consumed: 0,
        current_stock: Number(sf.fibre.stock_kg),
      };
    }),
    ...(order.shade.raw_cotton_composition || []).map((rc) => {
      const required = requiredQty * (rc.percentage / 100);
      return {
        fibre_name: 'RAW COTTON',
        required_qty: required,
        actual_consumed: 0,
        current_stock: rc.stock_kg ? Number(rc.stock_kg) : 0,
      };
    }),
  ];

  const averageEfficiency =
    logs.length > 0
      ? logs.reduce((sum, l) => sum + (Number(l.required_qty) > 0 ? Number(l.production_kg) / Number(l.required_qty) : 0), 0) / logs.length * 100
      : 0;

  const topProductionDay = logs.reduce((top, l) => {
    return l.production_kg > (top?.production_kg ?? 0) ? l : top;
  }, null);

  return {
    kpis: { requiredQty, producedQty, balanceQty, progressPercent },
    timeline,
    dailyChart,
    fiberSummary,
    insights: {
      averageEfficiency,
      noProductionDays: [],
      topProductionDay: topProductionDay
        ? { date: topProductionDay.date.toISOString(), production: Number(topProductionDay.production_kg) }
        : null,
    },
  };
};
