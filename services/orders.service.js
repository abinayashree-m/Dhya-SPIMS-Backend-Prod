const { prisma } = require('../prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

// 1. Get all orders with pagination
exports.getAllOrders = async (tenantId, options = {}) => {
  const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  

  
  try {
    // Build where clause
    const where = {
      tenantId: tenantId
    };

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { buyer: { name: { contains: search, mode: 'insensitive' } } },
        { shade: { shadeCode: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Build orderBy clause
    const orderBy = {};
    if (sortBy === 'order_number') orderBy.orderNumber = sortOrder;
    else if (sortBy === 'buyer') orderBy.buyer = { name: sortOrder };
    else if (sortBy === 'quantity_kg') orderBy.quantity = sortOrder;
    else if (sortBy === 'created_at') orderBy.createdAt = sortOrder;
    else if (sortBy === 'delivery_date') orderBy.deliveryDate = sortOrder;
    else if (sortBy === 'status') orderBy.status = sortOrder;
    else orderBy.createdAt = 'desc'; // default

    // Get total count for pagination
    const total = await prisma.order.count({ where });
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;



    // Get paginated orders
    const orders = await prisma.order.findMany({
      where,
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
      orderBy,
      skip,
      take: limit
    });

    // Transform camelCase to snake_case for frontend compatibility
    const transformedOrders = orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      buyer_id: order.buyerId,
      shade_id: order.shadeId,
      quantity_kg: order.quantity,
      unit_price: order.unitPrice,
      total_amount: order.totalAmount,
      order_date: order.orderDate,
      delivery_date: order.deliveryDate,
      status: order.status,
      notes: order.notes,
      count: order.count, // ✅ Added count field
      realisation: order.realisation, // ✅ Added realisation field
      tenant_id: order.tenantId,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      buyer: order.buyer,
      shade: {
        ...order.shade,
        shade_code: order.shade?.shadeCode,
        shade_name: order.shade?.shadeName,
        shade_fibres: order.shade?.shadeFibres?.map(sf => ({
          ...sf,
          fibre: sf.fibre ? {
            ...sf.fibre,
            fibre_code: sf.fibre.fibreCode,
            fibre_name: sf.fibre.fibreName,
            stock_kg: sf.fibre.stockKg,
            category: sf.fibre.category ? {
              ...sf.fibre.category,
              name: sf.fibre.category.name
            } : null
          } : null
        })),
        raw_cotton_compositions: order.shade?.rawCottonCompositions,
      }
    }));

    console.log('✅ [ORDERS] Successfully fetched and transformed orders:', {
      count: transformedOrders.length,
      orderNumbers: transformedOrders.map(o => o.order_number),
      statuses: transformedOrders.map(o => o.status)
    });

    // Return paginated response
    return {
      data: transformedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('❌ [ORDERS] Database error in getAllOrders:', error);
    throw new Error('Failed to fetch orders');
  }
};

// 2. Get order by ID
exports.getOrderById = async (id, tenantId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { 
        id,
        tenantId: tenantId
      },
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

    if (!order) return null;

    // Transform camelCase to snake_case for frontend compatibility
    return {
      id: order.id,
      order_number: order.orderNumber,
      buyer_id: order.buyerId,
      shade_id: order.shadeId,
      quantity_kg: order.quantity,
      unit_price: order.unitPrice,
      total_amount: order.totalAmount,
      order_date: order.orderDate,
      delivery_date: order.deliveryDate,
      status: order.status,
      notes: order.notes,
      count: order.count, // ✅ Added count field
      realisation: order.realisation, // ✅ Added realisation field
      tenant_id: order.tenantId,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      buyer: order.buyer,
      shade: {
        ...order.shade,
        shade_code: order.shade?.shadeCode,
        shade_name: order.shade?.shadeName,
        shade_fibres: order.shade?.shadeFibres?.map(sf => ({
          ...sf,
          fibre: sf.fibre ? {
            ...sf.fibre,
            fibre_code: sf.fibre.fibreCode,
            fibre_name: sf.fibre.fibreName,
            stock_kg: sf.fibre.stockKg,
            category: sf.fibre.category ? {
              ...sf.fibre.category,
              name: sf.fibre.category.name
            } : null
          } : null
        })),
        raw_cotton_compositions: order.shade?.rawCottonCompositions,
      }
    };
  } catch (error) {
    console.error('Database error in getOrderById:', error);
    throw new Error('Failed to fetch order');
  }
};

// 3. Create a new order
exports.createOrder = async (data, tenantId) => {
  try {
    const { buyerId, shadeId, ...orderData } = data;
    return await prisma.order.create({
      data: {
        ...orderData,
        tenantId: tenantId,
        buyer: { connect: { id: buyerId } },
        shade: { connect: { id: shadeId } }
      },
      include: {
        buyer: true,
        shade: true
      }
    });
  } catch (error) {
    console.error('Database error in createOrder:', error);
    throw new Error('Failed to create order');
  }
};

// 4. Update full order by ID
exports.updateOrder = async (id, data, tenantId) => {
  try {
    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { 
        id,
        tenantId: tenantId
      },
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
        where: { 
          id,
          tenantId: tenantId
        },
        data: {
          orderNumber: data.orderNumber,
          quantity: data.quantity ? new Decimal(data.quantity.toString()) : undefined,
          unitPrice: data.unitPrice ? new Decimal(data.unitPrice.toString()) : undefined,
          totalAmount: data.totalAmount ? new Decimal(data.totalAmount.toString()) : undefined,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
          status: data.status,
          notes: data.notes,
          count: data.count,
          realisation: data.realisation,
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
exports.updateOrderStatus = async (id, status, tenantId) => {
  try {
    return await prisma.order.update({
      where: { 
        id,
        tenantId: tenantId
      },
      data: { status }
    });
  } catch (error) {
    throw new Error('Failed to update order status');
  }
};

// 6. Delete an order
exports.deleteOrder = async (id, tenantId) => {
  try {
    console.log('🔄 [DELETE] Starting order deletion...');
    console.log('🔄 [DELETE] Order ID:', id);
    console.log('🔄 [DELETE] Tenant ID:', tenantId);

    // First check if there are any related records
    const order = await prisma.order.findUnique({
      where: { 
        id,
        tenantId: tenantId
      },
      include: {
        productions: true,
        purchaseOrders: true
      }
    });

    if (!order) {
      console.log('❌ [DELETE] Order not found');
      throw new Error('Order not found');
    }

    console.log('✅ [DELETE] Found order:', {
      id: order.id,
      orderNumber: order.orderNumber,
      productionsCount: order.productions.length,
      purchaseOrdersCount: order.purchaseOrders.length
    });

    // Check for related records
    if (order.productions.length > 0) {
      console.log('❌ [DELETE] Cannot delete: Has production records');
      throw new Error('Cannot delete order: It has associated production records. Please delete the production records first.');
    }

    // For Sales Orders, we should nullify the reference in Purchase Orders instead of blocking deletion
    if (order.purchaseOrders.length > 0) {
      console.log('🔄 [DELETE] Found linked purchase orders, nullifying references...');
      
      // Update all purchase orders that reference this sales order
      await prisma.purchaseOrder.updateMany({
        where: {
          linkedSalesOrderId: order.id,
          tenantId: tenantId
        },
        data: {
          linkedSalesOrderId: null,
          status: 'verified' // Reset status back to verified since SO is being deleted
        }
      });
      
      console.log('✅ [DELETE] Updated purchase orders to remove sales order reference');
    }

    // Delete the order
    console.log('🔄 [DELETE] Proceeding with deletion...');
    const deletedOrder = await prisma.order.delete({
      where: { 
        id,
        tenantId: tenantId
      }
    });

    console.log('✅ [DELETE] Order deleted successfully:', {
      id: deletedOrder.id,
      orderNumber: deletedOrder.orderNumber
    });

    return deletedOrder;
  } catch (error) {
    console.error('❌ [DELETE] Database error in deleteOrder:', error);
    if (error.message.includes('associated')) {
      throw error; // Re-throw our custom error messages
    }
    throw new Error('Failed to delete order');
  }
};

// 7. Get orders by buyer ID
exports.getOrdersByBuyerId = async (buyerId, tenantId) => {
  try {
    return await prisma.order.findMany({
      where: { 
        buyerId,
        tenantId: tenantId
      },
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
    console.error('Database error in getOrdersByBuyerId:', error);
    throw new Error('Failed to fetch orders for buyer');
  }
};

// 8. Get orders by status
exports.getOrdersByStatus = async (status, tenantId) => {
  try {
    return await prisma.order.findMany({
      where: { 
        status,
        tenantId: tenantId
      },
      include: {
        buyer: true,
        shade: true
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Database error in getOrdersByStatus:', error);
    throw new Error('Failed to fetch orders by status');
  }
};

// 9. Get order statistics
exports.getOrderStatistics = async (tenantId) => {
  try {
    const totalOrders = await prisma.order.count({
      where: { tenantId: tenantId }
    });
    const pendingOrders = await prisma.order.count({
      where: { 
        status: 'pending',
        tenantId: tenantId
      }
    });
    const completedOrders = await prisma.order.count({
      where: { 
        status: 'completed',
        tenantId: tenantId
      }
    });
    const totalValue = await prisma.order.aggregate({
      where: { tenantId: tenantId },
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
    console.error('Database error in getOrderStatistics:', error);
    throw new Error('Failed to fetch order statistics');
  }
};

// 10. Get order progress details
exports.getProgressDetails = async (id, tenantId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { 
        id,
        tenantId: tenantId
      },
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
        },
        productions: {
          include: {
            productionLogs: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Calculate progress based on production data
    const totalProduction = order.productions.reduce((sum, production) => {
      return sum + Number(production.value || 0);
    }, 0);

    const requiredQty = Number(order.quantity || 0);
    const producedQty = totalProduction;
    const balanceQty = Math.max(0, requiredQty - producedQty);
    const progressPercent = requiredQty > 0 ? (producedQty / requiredQty) * 100 : 0;

    // Calculate fiber usage summary
    const fiberSummary = [];
    if (order.shade?.shadeFibres) {
      order.shade.shadeFibres.forEach(sf => {
        const percentage = parseFloat(sf.percentage || 0);
        const requiredFibreQty = (percentage / 100) * requiredQty;
        const consumedFibreQty = (percentage / 100) * producedQty;
        const availableStock = parseFloat(sf.fibre?.stockKg || 0);
        
        fiberSummary.push({
          fibre_name: sf.fibre?.fibreName || 'Unknown',
          required_qty: requiredFibreQty,
          consumed_qty: consumedFibreQty,
          available_stock: availableStock
        });
      });
    }

    // Generate timeline data
    const timeline = order.productions.map(production => ({
      date: production.date.toISOString().split('T')[0],
      production: Number(production.value || 0),
      section: production.section || 'master'
    }));

    // Calculate daily chart data
    const dailyChart = timeline.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = { date, production: 0 };
      }
      acc[date].production += entry.production;
      return acc;
    }, {});

    // Find top production day
    const topProductionDay = Object.values(dailyChart).reduce((max, day) => 
      day.production > max.production ? day : max, 
      { date: '', production: 0 }
    );

    // Calculate average efficiency
    const averageEfficiency = timeline.length > 0 
      ? timeline.reduce((sum, entry) => sum + entry.production, 0) / timeline.length 
      : 0;

    // Generate insights
    const insights = [
      {
        type: 'info',
        message: `Order ${order.orderNumber} is ${progressPercent.toFixed(1)}% complete`,
        timestamp: new Date().toISOString()
      },
      {
        type: 'success',
        message: `Top production day: ${topProductionDay.date} with ${topProductionDay.production.toFixed(2)} kg`,
        timestamp: new Date().toISOString()
      }
    ];

    if (progressPercent >= 100) {
      insights.push({
        type: 'success',
        message: 'Production target achieved!',
        timestamp: new Date().toISOString()
      });
    }

    const progress = {
      // KPI data
      kpis: {
        requiredQty,
        producedQty,
        balanceQty,
        progressPercent
      },
      
      // Main metrics
      requiredQty,
      producedQty,
      averageEfficiency,
      
      // Detailed data
      fiberSummary,
      timeline,
      dailyChart: Object.values(dailyChart),
      insights,
      
      // Additional info
      topProductionDay,
      noProductionDays: [], // Could be calculated based on gaps in timeline
      
      // Order info
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerName: order.buyer?.name || 'Unknown',
      shadeName: order.shade?.shadeName || 'Unknown',
      status: order.status
    };

    return progress;
  } catch (error) {
    console.error('Database error in getProgressDetails:', error);
    throw new Error('Failed to fetch progress details');
  }
};
