const prisma = require('../prisma/client');

// Helper function to convert date to UTC
const toUTCDate = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// Helper function to get fixed required quantity for a section
const getFixedRequiredQty = (section) => {
  const requiredQtys = {
    blow_room: 1000,
    carding: 1000,
    drawing: 1000,
    framing: 1000,
    simplex: 1000,
    spinning: 1000,
    autoconer: 1000
  };
  return requiredQtys[section] || 1000;
};

// Helper function to calculate section total
const calculateSectionTotal = (section) => {
  if (!section) return 0;
  if (Array.isArray(section)) {
    return section.reduce((sum, entry) => sum + Number(entry.production_kg || 0), 0);
  }
  return Number(section.total || 0);
};

// Helper function to calculate total production
const calculateTotal = (sections) => {
  const sectionTotals = Object.entries(sections).map(([key, value]) => {
    if (key === 'total') return 0;
    return calculateSectionTotal(value);
  });
  return sectionTotals.reduce((sum, total) => sum + total, 0);
};

// Helper function to validate section data
const validateSectionData = (section, sectionName) => {
  if (!section) return false;
  if (sectionName === 'blow_room') {
    // Accept either single object with total/remarks OR array of entries like other sections
    return typeof section === 'object';
  }
  return Array.isArray(section);
};

// Get production by date
exports.getProductionByDate = async (date, tenant_id) => {
  try {
    const utcDate = toUTCDate(date);
    return await prisma.productions.findFirst({
      where: {
        date: utcDate,
        tenant_id
      }
    });
  } catch (error) {
    throw new Error('Failed to fetch production data');
  }
};

// Create or update production
exports.createOrUpdateProduction = async (data, tenant_id, user_id) => {
  try {
    const { date, ...productionData } = data;
    // Remove keys that are not part of Prisma model
    const { selected_orders, ...cleanData } = productionData;
    const utcDate = toUTCDate(date);

    // Validate section data
    const sections = ['blow_room', 'carding', 'drawing', 'framing', 'simplex', 'spinning', 'autoconer'];
    sections.forEach(section => {
      if (!validateSectionData(cleanData[section], section)) {
        throw new Error(`Invalid data format for ${section}`);
      }
    });

    // Calculate total production
    const total = calculateTotal(cleanData);

    // Check if production exists for this date
    const existing = await prisma.productions.findFirst({
      where: {
        date: utcDate,
        tenant_id
      }
    });

    if (existing) {
      // Update existing production
      const updateData = {
        ...cleanData,
        section: cleanData.section || 'master',
        total,
        updated_at: new Date()
      };

      return await prisma.production.update({
        where: { id: existing.id },
        data: updateData
      });
    } else {
      // Create new production
      const createData = {
        ...cleanData,
        section: cleanData.section || 'master',
        date: utcDate,
        total,
        tenant_id,
        created_by: user_id,
      };

      return await prisma.production.create({
        data: createData
      });
    }
  } catch (error) {
    throw new Error('Failed to create/update production');
  }
};

// Update production
exports.updateProduction = async (id, data) => {
  try {
    const { date, ...updateData } = data;
    
    // Validate section data
    const sections = ['blow_room', 'carding', 'drawing', 'framing', 'simplex', 'spinning', 'autoconer'];
    sections.forEach(section => {
      if (!validateSectionData(updateData[section], section)) {
        throw new Error(`Invalid data format for ${section}`);
      }
    });

    // Calculate total production
    const total = calculateTotal(updateData);

    return await prisma.production.update({
      where: { id },
      data: {
        ...updateData,
        total,
        updated_at: new Date()
      }
    });
  } catch (error) {
    throw new Error('Failed to update production');
  }
};

// Get all productions for a tenant
exports.getAllProductions = async (tenantId, orderId) => {
  try {
    const where = { tenantId };
    
    if (orderId) {
      where.orderId = orderId;
    }

    const results = await prisma.production.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        order: true
      }
    });

    return results.map(production => ({
      ...production,
      date: production.date.toISOString().split('T')[0]
    }));
  } catch (error) {
    throw new Error('Failed to fetch productions');
  }
};

//
// ==========================
// ✅ PRODUCTION MASTER ENTRIES
// ==========================
//

exports.getProductionById = async (id) => {
  return await prisma.production.findUnique({
    where: { id },
    include: {
      order: true,
      user: true,
    },
  });
};

//
// ==========================
// ✅ PRODUCTION LOG ENTRIES
// ==========================
//

exports.createProductionLog = async (data) => {
  return await prisma.productionLog.create({ data });
};

exports.getLogsByProductionId = async (production_id) => {
  return await prisma.productionLog.findMany({
    where: { production_id },
    orderBy: { log_date: 'asc' },
  });
};

exports.getDailySummary = async (tenant_id, date) => {
  return await prisma.productionLog.aggregate({
    where: {
      production: { tenant_id },
      log_date: new Date(date),
    },
    _sum: { production_kg: true },
  });
};

exports.getMachineSummary = async (tenant_id) => {
  return await prisma.productionLog.groupBy({
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
  const productions = await prisma.production.findMany({
    where: { tenant_id },
    orderBy: { date: 'asc' }
  });

  return productions.map(prod => {
    const total = Number(prod.total || 0);
    return {
      date: prod.date,
      total_produced: total,
      efficiency: 100 // Since we don't have required_qty in the new schema
    };
  });
};

exports.getMachineEfficiency = async (tenant_id) => {
  const productions = await prisma.production.findMany({
    where: { tenant_id }
  });

  const machineStats = {};

  productions.forEach(prod => {
    const sections = ['carding', 'drawing', 'framing', 'simplex', 'spinning', 'autoconer'];
    sections.forEach(section => {
      const sectionData = prod[section];
      if (Array.isArray(sectionData)) {
        sectionData.forEach(entry => {
          const machine = entry.machine;
          if (!machineStats[machine]) {
            machineStats[machine] = {
              total_produced: 0,
              days: 0
            };
          }
          machineStats[machine].total_produced += Number(entry.production_kg || 0);
          machineStats[machine].days++;
        });
      }
    });
  });

  return Object.entries(machineStats).map(([machine, stats]) => ({
    machine,
    total_produced: stats.total_produced,
    avg_efficiency: 100, // Since we don't have required_qty in the new schema
    days: stats.days
  }));
};

exports.getProductionAnalytics = async (tenant_id) => {
  const productions = await prisma.production.findMany({
    where: { tenant_id }
  });

  const totalProduced = productions.reduce(
    (sum, p) => sum + Number(p.total || 0),
    0
  );

  return {
    total_produced: Number(totalProduced.toFixed(2)),
    overall_efficiency: 100 // Since we don't have required_qty in the new schema
  };
};

exports.getProductionLogs = async (tenant_id) => {
    return await prisma.productionLog.findMany({
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
          date: true,
          total: true,
          remarks: true
          },
        },
      },
    });
  };

exports.getCumulativeProgressByOrder = async (order_id) => {
    const order = await prisma.order.findUnique({
    where: { id: order_id }
    });
  
    if (!order) throw new Error('Order not found');
  
  const productions = await prisma.production.findMany({
    where: { order_id },
    orderBy: { date: 'asc' }
  });

  const sections = ['blow_room', 'carding', 'drawing', 'framing', 'simplex', 'spinning', 'autoconer'];
  const sectionProgress = {};

  // Initialize section progress
  sections.forEach(section => {
    sectionProgress[section] = {
      total_produced: 0,
      entries: []
    };
  });

  // Calculate section-wise progress
  productions.forEach(prod => {
    sections.forEach(section => {
      const sectionData = prod[section];
      if (Array.isArray(sectionData)) {
        sectionData.forEach(entry => {
          sectionProgress[section].total_produced += Number(entry.production_kg || 0);
          sectionProgress[section].entries.push({
            date: prod.date,
            machine: entry.machine,
            shift: entry.shift,
            production_kg: Number(entry.production_kg || 0)
          });
        });
      } else if (sectionData && typeof sectionData === 'object') {
        sectionProgress[section].total_produced += Number(sectionData.total || 0);
        sectionProgress[section].entries.push({
          date: prod.date,
          production_kg: Number(sectionData.total || 0)
        });
      }
    });
  });

  // Calculate overall progress
  const totalProduced = Object.values(sectionProgress)
    .reduce((sum, section) => sum + section.total_produced, 0);
  const totalRequired = Number(order.quantity_kg || 0);
  const overallEfficiency = totalRequired > 0 
    ? (totalProduced / totalRequired) * 100 
    : 0;

  return {
    requiredQty: totalRequired,
    producedQty: totalProduced,
    overallEfficiency,
    sectionProgress,
    timeline: productions.map(p => ({
      date: p.date,
      total: Number(p.total || 0)
    }))
    };
  };

// PUBLIC: Create production (wrapper for REST controller)
exports.createProduction = async (data, user) => {
  const tenant_id = user?.tenantId;
  if (!tenant_id) {
    throw new Error('Unauthorized: Missing tenant ID');
  }
  return exports.createOrUpdateProduction(data, tenant_id, user.id);
};