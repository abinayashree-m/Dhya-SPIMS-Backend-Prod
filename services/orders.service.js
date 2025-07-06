const prisma = require('../prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

// 1. Get all orders
exports.getAllOrders = async () => {
  try {
    return await prisma.order.findMany({
      include: {
        buyer: true,
        shade: {
          include: {
            shadeFibres: {
              include: {
                fibre: true
              }
            },
            rawCottonCompositions: {
              include: {
                cotton: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    throw new Error('Failed to fetch orders');
  }
};

// 2. Get order by ID
exports.getOrderById = async (id) => {
  try {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: true,
        shade: {
          include: {
            shadeFibres: {
              include: {
                fibre: true
              }
            },
            rawCottonCompositions: {
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
    const { buyerId, shadeId, ...orderData } = data;
    return await prisma.order.create({
      data: {
        ...orderData,
        buyer: { connect: { id: buyerId } },
        shade: { connect: { id: shadeId } }
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
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        shade: {
          include: {
            rawCottonCompositions: {
              include: {
                cotton: true
              }
            },
            shadeFibres: {
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
    if (data.deliveryDate && isNaN(Date.parse(data.deliveryDate))) {
      throw new Error('Invalid delivery date format');
    }

    // Validate quantity
    if (data.quantity !== undefined && (isNaN(data.quantity) || Number(data.quantity) <= 0)) {
      throw new Error('Invalid quantity value');
    }

    // Start a transaction to handle both order update and raw cotton compositions
    const updatedOrder = await prisma.$transaction(async (prisma) => {
      // Update the order
      const order = await prisma.order.update({
        where: { id },
        data: {
          orderNumber: data.orderNumber,
          quantity: data.quantity ? new Decimal(data.quantity.toString()) : undefined,
          unitPrice: data.unitPrice ? new Decimal(data.unitPrice.toString()) : undefined,
          totalAmount: data.totalAmount ? new Decimal(data.totalAmount.toString()) : undefined,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
          status: data.status,
          notes: data.notes,
          buyer: data.buyerId ? {
            connect: {
              id: data.buyerId
            }
          } : undefined,
          shade: data.shadeId ? {
            connect: {
              id: data.shadeId
            }
          } : undefined
        },
        include: {
          buyer: true,
          shade: {
            include: {
              rawCottonCompositions: {
                include: {
                  cotton: true
                }
              },
              shadeFibres: {
                include: {
                  fibre: true
                }
              }
            }
          }
        }
      });

      // Handle raw cotton compositions if provided
      if (data.rawCottonCompositions && Array.isArray(data.rawCottonCompositions)) {
        // Delete existing compositions
        await prisma.rawCottonComposition.deleteMany({
          where: { shadeId: order.shade.id }
        });

        // Create new compositions
        if (data.rawCottonCompositions.length > 0) {
          await prisma.rawCottonComposition.createMany({
            data: data.rawCottonCompositions.map(rc => ({
              shadeId: order.shade.id,
              cottonId: rc.cottonId,
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
    return await prisma.order.update({
      where: { id },
      data: { status }
    });
  } catch (error) {
    throw new Error('Failed to update order status');
  }
};

// 6. Delete an order
exports.deleteOrder = async (id) => {
  try {
    return await prisma.order.delete({
      where: { id }
    });
  } catch (error) {
    throw new Error('Failed to delete order');
  }
};

// 7. Get orders by buyer ID
exports.getOrdersByBuyerId = async (buyerId) => {
  try {
    return await prisma.order.findMany({
      where: { buyerId },
    include: {
        buyer: true,
      shade: {
        include: {
            shadeFibres: {
              include: {
                fibre: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    throw new Error('Failed to fetch orders for buyer');
  }
};

// 8. Get orders by status
exports.getOrdersByStatus = async (status) => {
  try {
    return await prisma.order.findMany({
      where: { status },
      include: {
        buyer: true,
        shade: true
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    throw new Error('Failed to fetch orders by status');
  }
};

// 9. Get order statistics
exports.getOrderStatistics = async () => {
  try {
    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({
      where: { status: 'pending' }
    });
    const completedOrders = await prisma.order.count({
      where: { status: 'completed' }
    });
    const totalValue = await prisma.order.aggregate({
      _sum: {
        totalAmount: true
      }
    });

      return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalValue: totalValue._sum.totalAmount || 0
    };
  } catch (error) {
    throw new Error('Failed to fetch order statistics');
  }
};
