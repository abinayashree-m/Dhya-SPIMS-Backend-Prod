const prisma = require('../prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

// 1. Get all orders
exports.getAllOrders = async () => {
  try {
    return await prisma.orders.findMany({
      include: {
        buyer: true,
        shade: {
          include: {
            shade_fibres: {
              include: {
                fibre: true
              }
            },
            raw_cotton_compositions: {
              include: {
                cotton: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  } catch (error) {
    throw new Error('Failed to fetch orders');
  }
};

// 2. Get order by ID
exports.getOrderById = async (id) => {
  try {
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
            raw_cotton_compositions: {
              include: {
                cotton: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    throw new Error('Failed to fetch order');
  }
};

// 3. Create a new order
exports.createOrder = async (data) => {
  try {
    const { buyer_id, shade_id, ...orderData } = data;
    return await prisma.orders.create({
      data: {
        ...orderData,
        buyer: { connect: { id: buyer_id } },
        shade: { connect: { id: shade_id } }
      },
      include: {
        buyer: true,
        shade: true
      }
    });
  } catch (error) {
    throw new Error('Failed to create order');
  }
};

// 4. Update full order by ID
exports.updateOrder = async (id, data) => {
  try {
    // Check if order exists
    const existingOrder = await prisma.orders.findUnique({
      where: { id },
      include: {
        shade: {
          include: {
            raw_cotton_compositions: {
              include: {
                cotton: true
              }
            },
            shade_fibres: {
              include: {
                fibre: true
              }
            }
          }
        }
      }
    });

    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Validate delivery date
    if (data.delivery_date && isNaN(Date.parse(data.delivery_date))) {
      throw new Error('Invalid delivery date format');
    }

    // Validate count
    if (data.count !== undefined && (isNaN(data.count) || data.count <= 0)) {
      throw new Error('Invalid count value');
    }

    // Validate quantity
    if (data.quantity_kg !== undefined && (isNaN(data.quantity_kg) || Number(data.quantity_kg) <= 0)) {
      throw new Error('Invalid quantity value');
    }

    // Validate realisation
    if (data.realisation !== undefined && (isNaN(data.realisation) || Number(data.realisation) < 0 || Number(data.realisation) > 100)) {
      throw new Error('Invalid realisation value. Must be between 0 and 100');
    }

    // Start a transaction to handle both order update and raw cotton compositions
    const updatedOrder = await prisma.$transaction(async (prisma) => {
      // Update the order
      const order = await prisma.orders.update({
        where: { id },
        data: {
          order_number: data.order_number,
          quantity_kg: data.quantity_kg ? new Decimal(data.quantity_kg.toString()) : undefined,
          delivery_date: data.delivery_date ? new Date(data.delivery_date) : undefined,
          status: data.status,
          created_by: data.created_by,
          count: data.count,
          realisation: data.realisation !== undefined ? new Decimal(data.realisation.toString()) : undefined,
          buyer: data.buyer_id ? {
            connect: {
              id: data.buyer_id
            }
          } : undefined,
          shade: data.shade_id ? {
            connect: {
              id: data.shade_id
            }
          } : undefined
        },
        include: {
          buyer: true,
          shade: {
            include: {
              raw_cotton_compositions: {
                include: {
                  cotton: true
                }
              },
              shade_fibres: {
                include: {
                  fibre: true
                }
              }
            }
          }
        }
      });

      // Handle raw cotton compositions if provided
      if (data.raw_cotton_compositions && Array.isArray(data.raw_cotton_compositions)) {
        // Delete existing compositions
        await prisma.raw_cotton_compositions.deleteMany({
          where: { shade_id: order.shade.id }
        });

        // Create new compositions
        if (data.raw_cotton_compositions.length > 0) {
          await prisma.raw_cotton_compositions.createMany({
            data: data.raw_cotton_compositions.map(rc => ({
              shade_id: order.shade.id,
              cotton_id: rc.cotton_id,
              percentage: new Decimal(rc.percentage.toString())
            }))
          });
        }
      }

      return order;
    });

    return updatedOrder;
  } catch (error) {
    console.error('Order update error:', error);
    if (error.code === 'P2025') {
      throw new Error('Order not found');
    }
    if (error.code === 'P2002') {
      throw new Error('Order number already exists');
    }
    if (error.code === 'P2003') {
      throw new Error('Invalid reference: buyer or shade not found');
    }
    throw error;
  }
};

// 5. Update only the status
exports.updateOrderStatus = async (id, status) => {
  try {
    return await prisma.orders.update({
      where: { id },
      data: { status }
    });
  } catch (error) {
    throw new Error('Failed to update order status');
  }
};

// 6. Delete order
exports.deleteOrder = async (id) => {
  try {
    return await prisma.orders.delete({
      where: { id }
    });
  } catch (error) {
    throw new Error('Failed to delete order');
  }
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
          raw_cotton_compositions: true,
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
    ...(order.shade.raw_cotton_compositions || []).map((rc) => {
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
