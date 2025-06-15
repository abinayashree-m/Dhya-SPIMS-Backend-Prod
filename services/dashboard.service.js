const { PrismaClient, Decimal } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to get date ranges
const getDateRanges = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  return {
    today,
    startOfMonth,
    startOfYear,
    lastWeek
  };
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to calculate pending fiber shortages
const calculatePendingFiberShortages = async (tenantId) => {
  // Get all pending and in-progress orders
  const activeOrders = await prisma.orders.findMany({
    where: {
      tenant_id: tenantId,
      status: {
        in: ['pending', 'in_progress']
      }
    },
    include: {
      shade: {
        include: {
          shade_fibres: {
            include: {
              fibre: true
            }
          }
        }
      }
    }
  });

  const shortages = new Set();

  for (const order of activeOrders) {
    const requiredQty = new Decimal(order.quantity_kg).div(order.realisation || 100).mul(100);

    for (const sf of order.shade.shade_fibres) {
      const requiredFibreQty = requiredQty.mul(sf.percentage).div(100);
      const availableQty = new Decimal(sf.fibre.stock_kg);

      if (availableQty.lessThan(requiredFibreQty)) {
        shortages.add(sf.fibre_id);
      }
    }
  }

  return shortages.size;
};

// Helper function to calculate financial metrics
const calculateFinancialMetrics = async (tenantId) => {
  // Get all orders with their payments
  const orders = await prisma.orders.findMany({
    where: {
      tenant_id: tenantId,
      status: {
        in: ['completed', 'dispatched']
      }
    },
    include: {
      buyer: true
    }
  });

  // Get all purchase orders with their payments
  const purchaseOrders = await prisma.purchase_orders.findMany({
    where: {
      tenant_id: tenantId,
      status: {
        in: ['verified', 'converted']
      }
    },
    include: {
      items: true
    }
  });

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Calculate receivables
  const receivables = {
    total: 0,
    overdue: 0
  };

  for (const order of orders) {
    const orderValue = new Decimal(order.quantity_kg).mul(order.rate || 0);
    receivables.total += Number(orderValue);

    if (order.delivery_date < thirtyDaysAgo) {
      receivables.overdue += Number(orderValue);
    }
  }

  // Calculate payables
  const payables = {
    total: 0,
    overdue: 0
  };

  for (const po of purchaseOrders) {
    const poValue = po.items.reduce((sum, item) => 
      sum + Number(new Decimal(item.quantity).mul(item.rate)), 0);
    payables.total += poValue;

    if (po.po_date < thirtyDaysAgo) {
      payables.overdue += poValue;
    }
  }

  return { receivables, payables };
};

// Helper function to calculate production metrics
const calculateProductionMetrics = async (tenantId, startOfMonth) => {
  // Get all productions for the tenant
  const productions = await prisma.productions.findMany({
    where: {
      tenant_id: tenantId,
      date: {
        gte: startOfMonth
      }
    },
    orderBy: {
      date: 'desc'
    }
  });

  // Calculate total production
  const totalProduction = productions.reduce((sum, p) => sum + Number(p.total || 0), 0);

  // Calculate daily averages
  const uniqueDays = new Set(productions.map(p => p.date.toISOString().split('T')[0]));
  const avgDailyProduction = uniqueDays.size > 0 ? totalProduction / uniqueDays.size : 0;

  // Calculate section-wise production and quality metrics
  const sectionMetrics = productions.reduce((acc, p) => {
    const sections = ['blow_room', 'carding', 'drawing', 'framing', 'simplex', 'spinning', 'autoconer'];
    sections.forEach(section => {
      if (!acc[section]) {
        acc[section] = {
          totalProduction: 0,
          totalRequired: 0,
          downtime: 0,
          qualityIssues: 0,
          entries: [],
          efficiency: 0,
          totalEfficiency: 0,
          efficiencyCount: 0
        };
      }

      const sectionData = p[section];
      if (!sectionData) {
        return;
      }

      sectionData.forEach(entry => {
        if (entry) {
          const production = Number(entry.production_kg || 0);
          const required = 1000; // Fixed required quantity for other sections
          
          acc[section].totalProduction += production;
          acc[section].totalRequired += required;
          acc[section].entries.push(entry);

          // Calculate efficiency for this entry
          const efficiency = (production / required) * 100;
          acc[section].totalEfficiency += efficiency;
          acc[section].efficiencyCount++;

          if (entry.remarks?.toLowerCase().includes('downtime')) {
            acc[section].downtime++;
          }
          if (entry.remarks?.toLowerCase().includes('quality') || 
              entry.remarks?.toLowerCase().includes('defect')) {
            acc[section].qualityIssues++;
          }
        }
      });
    });

    return acc;
  }, {});

  // Calculate final section metrics
  const sectionProduction = {};
  const sectionQuality = {};
  const sectionDowntime = {};
  const sectionEfficiency = {};

  Object.entries(sectionMetrics).forEach(([section, metrics]) => {
    // Production metrics
    sectionProduction[section] = metrics.totalProduction;
    
    // Quality metrics
    const totalEntries = metrics.entries.length;
    sectionQuality[section] = {
      totalIssues: metrics.qualityIssues,
      issueRate: totalEntries > 0 ? (metrics.qualityIssues / totalEntries) * 100 : 0
    };
    
    // Downtime metrics
    sectionDowntime[section] = {
      totalIncidents: metrics.downtime,
      downtimeRate: totalEntries > 0 ? (metrics.downtime / totalEntries) * 100 : 0
    };

    // Efficiency metrics
    const overallEfficiency = (metrics.totalProduction / metrics.totalRequired) * 100;
    const averageEfficiency = metrics.efficiencyCount > 0 ? metrics.totalEfficiency / metrics.efficiencyCount : 0;

    sectionEfficiency[section] = {
      overall: overallEfficiency,
      average: averageEfficiency
    };
  });

  // Calculate machine-wise metrics
  const machineMetrics = productions.reduce((acc, p) => {
    const sections = ['carding', 'drawing', 'framing', 'simplex', 'spinning', 'autoconer'];
    sections.forEach(section => {
      const sectionData = p[section];
      if (!sectionData || !Array.isArray(sectionData)) return;

      sectionData.forEach(entry => {
        if (entry && entry.machine) {
          const machine = entry.machine;
          if (!acc[machine]) {
            acc[machine] = {
              totalProduction: 0,
              totalRequired: 0,
              downtime: 0,
              qualityIssues: 0,
              days: new Set(),
              shifts: new Set(),
              totalEfficiency: 0,
              efficiencyCount: 0,
              dailyProduction: {} // Track daily production for each machine
            };
          }
          
          const production = Number(entry.production_kg || 0);
          const required = 1000; // Fixed required quantity
          const dateKey = p.date.toISOString().split('T')[0];
          
          acc[machine].totalProduction += production;
          acc[machine].totalRequired += required;
          acc[machine].days.add(dateKey);
          acc[machine].shifts.add(entry.shift);
          
          // Track daily production
          if (!acc[machine].dailyProduction[dateKey]) {
            acc[machine].dailyProduction[dateKey] = 0;
          }
          acc[machine].dailyProduction[dateKey] += production;
          
          // Calculate efficiency for this entry
          const efficiency = (production / required) * 100;
          acc[machine].totalEfficiency += efficiency;
          acc[machine].efficiencyCount++;
          
          if (entry.remarks?.toLowerCase().includes('downtime')) {
            acc[machine].downtime++;
          }
          if (entry.remarks?.toLowerCase().includes('quality') || 
              entry.remarks?.toLowerCase().includes('defect')) {
            acc[machine].qualityIssues++;
          }
        }
      });
    });
    return acc;
  }, {});

  // Transform machine metrics
  const machineMetricsResult = Object.entries(machineMetrics).map(([machine, data]) => {
    const overallEfficiency = (data.totalProduction / data.totalRequired) * 100;
    const averageEfficiency = data.efficiencyCount > 0 ? data.totalEfficiency / data.efficiencyCount : 0;
    
    // Calculate average daily production from historical data
    const productionDays = Object.keys(data.dailyProduction).length;
    const avgDailyProduction = productionDays > 0 ? data.totalProduction / productionDays : 0;

    return {
      machine,
      total_production: data.totalProduction,
      avg_daily_production: avgDailyProduction,
      production_days: productionDays,
      shifts_operated: data.shifts.size,
      efficiency: {
        overall: overallEfficiency,
        average: averageEfficiency
      },
      downtime_incidents: data.downtime,
      quality_issues: data.qualityIssues
    };
  });

  // Calculate production trends
  const dailyProduction = productions.reduce((acc, p) => {
    const date = p.date.toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + Number(p.total || 0);
    return acc;
  }, {});

  const productionTrend = Object.entries(dailyProduction)
    .map(([date, production]) => ({
      date,
      production
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const metrics = {
    totalProduction,
    avgDailyProduction,
    sectionProduction,
    sectionQuality,
    sectionDowntime,
    machineMetrics: machineMetricsResult,
    productionTrend,
    productionDays: uniqueDays.size
  };

  return metrics;
};

// Helper function to calculate top buyers
const calculateTopBuyers = async (tenantId, startOfMonth) => {
  // Get all orders for the tenant
  const orders = await prisma.orders.findMany({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: startOfMonth
      }
    },
    include: {
      buyer: true
    }
  });

  // Group by buyer and calculate totals
  const buyerTotals = orders.reduce((acc, order) => {
    const buyerId = order.buyer_id;
    if (!acc[buyerId]) {
      acc[buyerId] = {
        name: order.buyer.name,
        total: 0,
        orders: 0
      };
    }
    acc[buyerId].total += Number(order.quantity_kg);
    acc[buyerId].orders += 1;
    return acc;
  }, {});

  // Convert to array and sort
  const topBuyers = Object.entries(buyerTotals)
    .map(([id, data]) => ({
      buyer_id: id || `unknown-${Date.now()}-${Math.random()}`, // Ensure unique ID
      name: data.name || 'Unknown Buyer',
      total: data.total,
      orders: data.orders
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return topBuyers;
};

// Helper function to calculate order metrics
const calculateOrderMetrics = async (tenantId) => {
  // Get all orders for the tenant
  const orders = await prisma.orders.findMany({
    where: { tenant_id: tenantId },
    include: {
      buyer: true,
      shade: true
    }
  });

  // Calculate total orders
  const totalOrders = orders.length;

  // Calculate status breakdown
  const statusBreakdown = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate pending and overdue orders
  const now = new Date();
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const overdueOrders = orders.filter(order => {
    return order.status !== 'completed' && 
           order.status !== 'dispatched' && 
           new Date(order.delivery_date) < now;
  }).length;

  // Calculate recent orders (last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOrders = orders.filter(order => 
    new Date(order.created_at) >= thirtyDaysAgo
  ).length;

  // Calculate top buyers by order count
  const buyerStats = orders.reduce((acc, order) => {
    const buyerId = order.buyer_id;
    if (!acc[buyerId]) {
      acc[buyerId] = {
        name: order.buyer.name,
        count: 0,
        totalQuantity: 0
      };
    }
    acc[buyerId].count++;
    acc[buyerId].totalQuantity += Number(order.quantity_kg);
    return acc;
  }, {});

  const topBuyers = Object.entries(buyerStats)
    .map(([id, stats]) => ({
      buyer_id: id || `unknown-${Date.now()}-${Math.random()}`, // Ensure unique ID
      name: stats.name || 'Unknown Buyer',
      order_count: stats.count,
      total_quantity: stats.totalQuantity
    }))
    .sort((a, b) => b.order_count - a.order_count)
    .slice(0, 5);

  const metrics = {
    totalOrders,
    statusBreakdown,
    pendingOrders,
    overdueOrders,
    recentOrders,
    topBuyers
  };

  return metrics;
};

// Helper function to calculate purchase order metrics
const calculatePurchaseOrderMetrics = async (tenantId) => {
  // Get all purchase orders for the tenant
  const purchaseOrders = await prisma.purchase_orders.findMany({
    where: { tenant_id: tenantId },
    include: {
      items: true
    }
  });

  // Calculate total purchase orders
  const totalPOs = purchaseOrders.length;

  // Calculate status breakdown
  const statusBreakdown = purchaseOrders.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate total value
  const totalValue = purchaseOrders.reduce((sum, po) => {
    const poValue = po.items.reduce((itemSum, item) => 
      itemSum + Number(item.quantity) * Number(item.rate), 0);
    return sum + poValue;
  }, 0);

  // Calculate conversion rate
  const convertedPOs = purchaseOrders.filter(po => po.status === 'converted').length;
  const conversionRate = totalPOs > 0 ? (convertedPOs / totalPOs) * 100 : 0;

  const metrics = {
    totalPOs,
    statusBreakdown,
    totalValue,
    conversionRate,
    convertedPOs
  };

  return metrics;
};

// Default dashboard summary structure
const getDefaultDashboardSummary = () => ({
  orders: {
    totalOrders: 0,
    statusBreakdown: {
      pending: 0,
      in_progress: 0,
      completed: 0,
      dispatched: 0
    },
    pendingOrders: 0,
    overdueOrders: 0,
    topBuyers: []
  },
  purchaseOrders: {
    totalPOs: 0,
    statusBreakdown: {
      uploaded: 0,
      converted: 0,
      verified: 0
    },
    totalValue: 0,
    conversionRate: 0,
    convertedPOs: 0
  },
  production: {
    totalProduction: 0,
    avgDailyProduction: 0,
    sectionProduction: {
      blow_room: 0,
      carding: 0,
      drawing: 0,
      framing: 0,
      simplex: 0,
      spinning: 0,
      autoconer: 0
    },
    sectionQuality: {
      blow_room: { totalIssues: 0, issueRate: 0 },
      carding: { totalIssues: 0, issueRate: 0 },
      drawing: { totalIssues: 0, issueRate: 0 },
      framing: { totalIssues: 0, issueRate: 0 },
      simplex: { totalIssues: 0, issueRate: 0 },
      spinning: { totalIssues: 0, issueRate: 0 },
      autoconer: { totalIssues: 0, issueRate: 0 }
    },
    sectionDowntime: {
      blow_room: { totalIncidents: 0, downtimeRate: 0 },
      carding: { totalIncidents: 0, downtimeRate: 0 },
      drawing: { totalIncidents: 0, downtimeRate: 0 },
      framing: { totalIncidents: 0, downtimeRate: 0 },
      simplex: { totalIncidents: 0, downtimeRate: 0 },
      spinning: { totalIncidents: 0, downtimeRate: 0 },
      autoconer: { totalIncidents: 0, downtimeRate: 0 }
    },
    machineMetrics: [],
    productionTrend: [],
    productionDays: 0
  },
  financial: {
    receivables: {
      total: 0,
      overdue: 0
    },
    payables: {
      total: 0,
      overdue: 0
    }
  }
});

// Get all historical production data for the tenant
const getAllHistoricalProductions = async (tenantId) => {
  return await prisma.productions.findMany({
    where: { tenant_id: tenantId },
    orderBy: { date: 'asc' }
  });
};

exports.getDashboardSummary = async (user) => {
  // Initialize with default structure
  const summary = getDefaultDashboardSummary();
  
  if (!user || !user.tenantId) {
    return summary;
  }

  try {
    // Get all historical productions
    const allProductions = await getAllHistoricalProductions(user.tenantId);

    // Calculate production metrics
    if (allProductions.length > 0) {
      const { totalProduction, avgDailyProduction, sectionProduction, sectionQuality, sectionDowntime, machineMetrics, productionTrend, productionDays } = await calculateProductionMetrics(user.tenantId, getDateRanges().startOfMonth);
      summary.production = {
        totalProduction,
        avgDailyProduction,
        sectionProduction,
        sectionQuality,
        sectionDowntime,
        machineMetrics,
        productionTrend,
        productionDays
      };
    }

    // Calculate order metrics
    const orders = await prisma.orders.findMany({
      where: { tenant_id: user.tenantId },
      include: { buyer: true }
    });

    if (orders.length > 0) {
      summary.orders = {
        totalOrders: orders.length,
        statusBreakdown: orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, { pending: 0, in_progress: 0, completed: 0, dispatched: 0 }),
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        overdueOrders: orders.filter(o => {
          const deliveryDate = new Date(o.delivery_date);
          return o.status !== 'completed' && deliveryDate < new Date();
        }).length,
        topBuyers: Object.entries(
          orders.reduce((acc, order) => {
            acc[order.buyer.name] = (acc[order.buyer.name] || 0) + 1;
            return acc;
          }, {})
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
      };
    }

    // Calculate purchase order metrics
    const purchaseOrders = await prisma.purchase_orders.findMany({
      where: { tenant_id: user.tenantId },
      include: { items: true }
    });

    if (purchaseOrders.length > 0) {
      const convertedPOs = purchaseOrders.filter(po => po.status === 'converted').length;
      summary.purchaseOrders = {
        totalPOs: purchaseOrders.length,
        statusBreakdown: purchaseOrders.reduce((acc, po) => {
          acc[po.status] = (acc[po.status] || 0) + 1;
          return acc;
        }, { uploaded: 0, converted: 0, verified: 0 }),
        totalValue: purchaseOrders.reduce((sum, po) => sum + Number(po.grand_total || 0), 0),
        conversionRate: (convertedPOs / purchaseOrders.length) * 100,
        convertedPOs
      };
    }

    // Calculate financial metrics
    const receivables = await prisma.orders.findMany({
      where: {
        tenant_id: user.tenantId,
        status: { in: ['completed', 'dispatched'] }
      }
    });

    if (receivables.length > 0) {
      summary.financial.receivables = {
        total: receivables.reduce((sum, order) => sum + Number(order.quantity_kg || 0), 0),
        overdue: receivables.filter(order => {
          const deliveryDate = new Date(order.delivery_date);
          return order.status === 'dispatched' && deliveryDate < new Date();
        }).length
      };
    }

    return summary;
  } catch (error) {
    return summary;
  }
}; 