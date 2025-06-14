const prisma = require('../prisma/client');

// Helper function to ensure UTC date
const toUTCDate = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// Helper function to calculate section total
const calculateSectionTotal = (section) => {
  if (!section) return 0;
  
  if (Array.isArray(section)) {
    return section.reduce((sum, row) => sum + (row.production_kg || 0), 0);
  } else if (typeof section === 'object') {
    return section.total || 0;
  }
  return 0;
};

// Helper function to calculate total production across all sections
const calculateTotal = (sections) => {
  return [
    calculateSectionTotal(sections.blow_room),
    calculateSectionTotal(sections.carding),
    calculateSectionTotal(sections.drawing),
    calculateSectionTotal(sections.framing),
    calculateSectionTotal(sections.simplex),
    calculateSectionTotal(sections.spinning),
    calculateSectionTotal(sections.autoconer)
  ].reduce((sum, val) => sum + val, 0);
};

// Helper function to validate section data
const validateSectionData = (section, sectionName) => {
  if (!section) return;

  if (Array.isArray(section)) {
    section.forEach((row, index) => {
      if (!row.machine || !row.shift || row.production_kg === undefined) {
        throw new Error(`${sectionName} row ${index + 1} is missing required fields`);
      }
      if (row.production_kg < 0) {
        throw new Error(`${sectionName} row ${index + 1} has invalid production quantity`);
      }
      if (row.required_qty !== undefined && row.production_kg > row.required_qty) {
        throw new Error(`${sectionName} row ${index + 1} production exceeds required quantity`);
      }
    });
  } else if (typeof section === 'object') {
    if (section.total !== undefined && section.total < 0) {
      throw new Error(`${sectionName} has invalid total quantity`);
    }
  }
};

// Get production by date
exports.getProductionByDate = async (date, tenantId) => {
  try {
    const startOfDay = toUTCDate(date);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return await prisma.productions.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        tenant_id: tenantId
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  } catch (error) {
    console.error('Error in getProductionByDate:', error);
    throw error;
  }
};

// Create production entry
exports.createProduction = async (data, user) => {
  try {
    const {
      date,
      blow_room,
      carding,
      drawing,
      framing,
      simplex,
      spinning,
      autoconer,
      remarks
    } = data;

    // Validate section data if provided
    if (blow_room) validateSectionData(blow_room, 'blow_room');
    if (carding) validateSectionData(carding, 'carding');
    if (drawing) validateSectionData(drawing, 'drawing');
    if (framing) validateSectionData(framing, 'framing');
    if (simplex) validateSectionData(simplex, 'simplex');
    if (spinning) validateSectionData(spinning, 'spinning');
    if (autoconer) validateSectionData(autoconer, 'autoconer');

    // Calculate total production
    const total = calculateTotal({
      blow_room,
      carding,
      drawing,
      framing,
      simplex,
      spinning,
      autoconer
    });

    // Check if production entry already exists for this date and tenant
    const existing = await prisma.productions.findFirst({
      where: {
        date: new Date(date),
        tenant_id: user.tenantId
      }
    });

    if (existing) {
      // Update existing entry instead of creating new one
      const updateData = {
        blow_room: blow_room || existing.blow_room,
        carding: carding || existing.carding,
        drawing: drawing || existing.drawing,
        framing: framing || existing.framing,
        simplex: simplex || existing.simplex,
        spinning: spinning || existing.spinning,
        autoconer: autoconer || existing.autoconer,
        total,
        remarks: remarks || existing.remarks
      };
      console.log('[Production API] Storing (update) in Prisma:', updateData);
      return await prisma.productions.update({
        where: { id: existing.id },
        data: updateData
      });
    }

    // Create new production entry
    const createData = {
      date: new Date(date),
      tenant_id: user.tenantId,
      created_by: user.id,
      section: 'production',
      blow_room: blow_room || {},
      carding: carding || [],
      drawing: drawing || [],
      framing: framing || [],
      simplex: simplex || [],
      spinning: spinning || [],
      autoconer: autoconer || [],
      total,
      remarks: remarks || ''
    };
    console.log('[Production API] Storing (create) in Prisma:', createData);
    return await prisma.productions.create({
      data: createData
    });
  } catch (error) {
    console.error('Error in createProduction:', error);
    throw error;
  }
};

// Update production entry
exports.updateProduction = async (id, data, user) => {
  const {
    blow_room,
    carding,
    drawing,
    framing,
    simplex,
    spinning,
    autoconer,
    remarks
  } = data;

  // Get existing entry
  const existing = await prisma.productions.findFirst({
    where: {
      id,
      tenant_id: user.tenantId
    }
  });

  if (!existing) {
    throw new Error('Production entry not found');
  }

  // Validate all sections if provided
  if (blow_room) validateSectionData(blow_room, 'blow_room');
  if (carding) validateSectionData(carding, 'carding');
  if (drawing) validateSectionData(drawing, 'drawing');
  if (framing) validateSectionData(framing, 'framing');
  if (simplex) validateSectionData(simplex, 'simplex');
  if (spinning) validateSectionData(spinning, 'spinning');
  if (autoconer) validateSectionData(autoconer, 'autoconer');

  // Calculate new total based on provided sections
  const total = calculateTotal({
    blow_room: blow_room || existing.blow_room,
    carding: carding || existing.carding,
    drawing: drawing || existing.drawing,
    framing: framing || existing.framing,
    simplex: simplex || existing.simplex,
    spinning: spinning || existing.spinning,
    autoconer: autoconer || existing.autoconer
  });

  // Prepare update data
  const updateData = {
    blow_room: blow_room || existing.blow_room,
    carding: carding || existing.carding,
    drawing: drawing || existing.drawing,
    framing: framing || existing.framing,
    simplex: simplex || existing.simplex,
    spinning: spinning || existing.spinning,
    autoconer: autoconer || existing.autoconer,
    total,
    remarks: remarks !== undefined ? remarks : existing.remarks,
    updated_at: new Date()
  };

  console.log('[Production API] Updating production with data:', updateData);

  // Update the production entry
  return await prisma.productions.update({
    where: { id },
    data: updateData,
    include: {
      order: {
        include: {
          buyer: true,
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
      },
      creator: true,
      tenant: true,
      logs: true
    }
  });
};

// Delete production entry
exports.deleteProduction = async (id, user) => {
  const existing = await prisma.productions.findFirst({
    where: {
      id,
      tenant_id: user.tenantId
    }
  });

  if (!existing) {
    throw new Error('Production entry not found');
  }

  return await prisma.productions.delete({
    where: { id }
  });
};

// List all production entries
exports.listProductions = async (user, { startDate, endDate, page = 1, limit = 10 }) => {
  const where = {
    tenant_id: user.tenantId
  };

  if (startDate && endDate) {
    where.date = {
      gte: toUTCDate(startDate),
      lte: toUTCDate(endDate)
    };
  }

  const [total, entries] = await Promise.all([
    prisma.productions.count({ where }),
    prisma.productions.findMany({
      where,
      orderBy: {
        date: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  return {
    entries,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

//
// ==========================
// ✅ PRODUCTION MASTER ENTRIES
// ==========================
//

exports.getAllProductions = async (tenant_id) => {
  console.log('[Production API] Fetching all productions for tenant_id:', tenant_id);
  const results = await prisma.productions.findMany({
    where: { tenant_id },
    include: {
      order: {
        include: {
          buyer: true,
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
      },
      creator: true,
      tenant: true,
      logs: true
    },
    orderBy: { date: 'desc' }
  });
  console.log('[Production API] Number of productions fetched:', results.length);
  return results;
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
  const productions = await prisma.productions.findMany({
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
  const productions = await prisma.productions.findMany({
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
  const productions = await prisma.productions.findMany({
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
          date: true,
          total: true,
          remarks: true
          },
        },
      },
    });
  };

exports.getCumulativeProgressByOrder = async (order_id) => {
    const order = await prisma.orders.findUnique({
    where: { id: order_id }
    });
  
    if (!order) throw new Error('Order not found');
  
  const productions = await prisma.productions.findMany({
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