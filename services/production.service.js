const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//
// ==========================
// ✅ PRODUCTION MASTER ENTRIES
// ==========================
//

exports.createProduction = async (data) => {
    const { tenant_id, user_id, order_id, date, ...rest } = data;
  
    if (!tenant_id || !user_id || !order_id) {
      throw new Error('Missing required tenant_id, user_id, or order_id');
    }
  
    return await prisma.productions.create({
      data: {
        ...rest,
        date: new Date(date), // ✅ Ensure it's a Date object
        tenant: {
          connect: { id: tenant_id },
        },
        user: {
          connect: { id: user_id },
        },
        order: {
          connect: { id: order_id },
        },
      },
    });
  };

exports.getAllProductions = async (tenant_id) => {
  return await prisma.productions.findMany({
    where: { tenant_id },
    include: {
      order: {
        include: {
          buyer: true,
          shade: {
            include: {
              shade_fibres: {
                include: {
                  fibre: true,
                },
              },
            },
          },
        },
      },
      user: true,
    },
    orderBy: { date: 'desc' },
  });
};

exports.getProductionById = async (id) => {
  return await prisma.productions.findUnique({
    where: { id },
    include: {
      order: true,
      user: true,
    },
  });
};

exports.updateProduction = async (id, data) => {
  return await prisma.productions.update({
    where: { id },
    data,
  });
};

exports.deleteProduction = async (id) => {
  return await prisma.productions.delete({
    where: { id },
  });
};


//
// ==========================
// ✅ PRODUCTION LOG ENTRIES
// ==========================
//

exports.createProductionLog = async (data) => {
  return await prisma.production_logs.create({ data });
};

exports.getLogsByProductionId = async (production_id) => {
  return await prisma.production_logs.findMany({
    where: { production_id },
    orderBy: { log_date: 'asc' },
  });
};

exports.getDailySummary = async (tenant_id, date) => {
  return await prisma.production_logs.aggregate({
    where: {
      production: { tenant_id },
      log_date: new Date(date),
    },
    _sum: { production_kg: true },
  });
};

exports.getMachineSummary = async (tenant_id) => {
  return await prisma.production_logs.groupBy({
    by: ['machine'],
    where: {
      production: { tenant_id },
    },
    _sum: { production_kg: true },
    orderBy: {
      _sum: { production_kg: 'desc' },
    },
  });
};


//
// ==========================
// ✅ ANALYTICS & EFFICIENCY
// ==========================
//

exports.getDailyEfficiency = async (tenant_id) => {
  const rawData = await prisma.productions.groupBy({
    by: ['date'],
    where: { tenant_id },
    _sum: {
      production_kg: true,
      required_qty: true,
    },
    orderBy: { date: 'asc' },
  });

  return rawData.map((r) => ({
    date: r.date,
    total_produced: parseFloat(r._sum.production_kg),
    total_required: parseFloat(r._sum.required_qty),
    efficiency: parseFloat(
      ((r._sum.production_kg / r._sum.required_qty) * 100).toFixed(2)
    ),
  }));
};

exports.getMachineEfficiency = async (tenant_id) => {
  const raw = await prisma.productions.groupBy({
    by: ['machine'],
    where: { tenant_id },
    _sum: {
      production_kg: true,
      required_qty: true,
    },
    _count: { id: true },
  });

  return raw.map((m) => ({
    machine: m.machine,
    total_produced: parseFloat(m._sum.production_kg),
    avg_efficiency: parseFloat(
      ((m._sum.production_kg / m._sum.required_qty) * 100).toFixed(2)
    ),
    days: m._count.id,
  }));
};

exports.getProductionAnalytics = async (tenant_id) => {
  const productions = await prisma.productions.findMany({
    where: { tenant_id },
  });

  const totalProduced = productions.reduce(
    (sum, p) => sum + Number(p.production_kg),
    0
  );
  const totalRequired = productions.reduce(
    (sum, p) => sum + Number(p.required_qty),
    0
  );
  const totalOrders = new Set(productions.map((p) => p.order_id)).size;

  return {
    total_orders: totalOrders,
    total_produced: Number(totalProduced.toFixed(2)),
    overall_efficiency:
      totalRequired > 0
        ? Number(((totalProduced / totalRequired) * 100).toFixed(2))
        : 0,
  };
};
exports.getProductionLogs = async (tenant_id) => {
    return await prisma.production_logs.findMany({
      where: {
        production: {
          tenant_id,
        },
      },
      orderBy: {
        log_date: 'desc',
      },
      include: {
        production: {
          select: {
            machine: true,
            section: true,
            shift: true,
          },
        },
      },
    });
  };
exports.getCumulativeProgressByOrder = async (order_id) => {
    const totalProduced = await prisma.production_logs.aggregate({
      where: { production: { order_id } },
      _sum: { production_kg: true },
    });
  
    const order = await prisma.orders.findUnique({
      where: { id: order_id },
    });
  
    if (!order) throw new Error('Order not found');
  
    return {
      requiredQty: Number(order.quantity_kg || 0),
      producedQty: Number(totalProduced._sum.production_kg || 0),
    };
  };