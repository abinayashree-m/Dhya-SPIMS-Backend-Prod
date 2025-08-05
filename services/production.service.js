const { prisma } = require('../prisma/client');

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
exports.getProductionByDate = async (date, tenantId) => {
  try {
    const utcDate = toUTCDate(date);
    return await prisma.production.findFirst({
      where: {
        date: utcDate,
        tenantId
      }
    });
  } catch (error) {
    throw new Error('Failed to fetch production data');
  }
};

// Create or update production
exports.createOrUpdateProduction = async (data, tenantId, userId) => {
  try {
    const { date, selected_orders, ...productionData } = data;
    const utcDate = toUTCDate(date);

    // Check if production already exists for this date and tenant
    const existingProduction = await prisma.production.findFirst({
      where: {
        date: utcDate,
        tenantId,
        section: 'master' // Use 'master' to indicate this is the main production record
      }
    });

    // Calculate totals for each section
    const sectionTotals = {};
    const sections = ['blow_room', 'carding', 'drawing', 'framing', 'simplex', 'spinning', 'autoconer'];
    
    for (const section of sections) {
      const sectionData = productionData[section];
      if (!sectionData) {
        sectionTotals[section] = 0;
        continue;
      }

      let sectionTotal = 0;
      
      if (section === 'blow_room' && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
        // Handle blow_room as single object
        sectionTotal = parseFloat(sectionData.production_kg || sectionData.total || 0);
      } else if (Array.isArray(sectionData)) {
        // Handle other sections as arrays
        sectionTotal = sectionData.reduce((sum, entry) => {
          return sum + parseFloat(entry.production_kg || entry.value || 0);
        }, 0);
      }
      
      sectionTotals[section] = sectionTotal;
    }

    // Calculate overall total
    const overallTotal = Object.values(sectionTotals).reduce((sum, total) => sum + total, 0);

    if (existingProduction) {
      // Update existing production record
      const updatedProduction = await prisma.production.update({
        where: { id: existingProduction.id },
        data: {
          value: overallTotal,
          updatedAt: new Date()
        }
      });

      console.log('✅ [PRODUCTION] Updated existing production:', {
        id: updatedProduction.id,
        date: utcDate,
        total: overallTotal,
        sectionTotals
      });

      return updatedProduction;
    } else {
      // Create new production record
      const newProduction = await prisma.production.create({
        data: {
          date: utcDate,
          section: 'master',
          shift: 'A', // Default shift for master record
          value: overallTotal,
          orderId: selected_orders?.[0],
          tenantId,
          createdBy: userId,
        }
      });

      console.log('✅ [PRODUCTION] Created new production:', {
        id: newProduction.id,
        date: utcDate,
        total: overallTotal,
        sectionTotals
      });

      return newProduction;
    }
  } catch (error) {
    console.error('❌ [PRODUCTION] Error in createOrUpdateProduction:', error);
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
        updatedAt: new Date()
      }
    });
  } catch (error) {
    throw new Error('Failed to update production');
  }
};

// Get all productions for a tenant
exports.getAllProductions = async (tenantId, orderId) => {
  try {
    console.log('🔍 [PRODUCTION] getAllProductions called with:', { tenantId, orderId });
    
    const where = { tenantId };
    
    if (orderId) {
      where.orderId = orderId;
    }

    console.log('🔍 [PRODUCTION] Query where clause:', where);

    const results = await prisma.production.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        order: true
      }
    });

    console.log('🔍 [PRODUCTION] Found', results.length, 'productions');
    console.log('🔍 [PRODUCTION] Raw results:', results.map(r => ({ section: r.section, value: r.value, date: r.date.toISOString().split('T')[0] })));

    // If orderId is provided, return individual production records for that order
    if (orderId) {
      console.log('🔍 [PRODUCTION] Returning individual records for order:', orderId);
      const orderRecords = results
        .filter(production => production.section !== 'master') // Exclude master records
        .map(production => ({
          id: production.id,
          date: production.date.toISOString().split('T')[0],
          section: production.section,
          machine: production.section,
          shift: production.shift,
          production_kg: Number(production.value || 0),
          required_qty: 1000, // Default required quantity
          order_id: production.orderId,
          tenant_id: production.tenantId,
          user_id: production.createdBy,
          created_at: production.createdAt,
          updated_at: production.updatedAt || production.createdAt
        }));
      
      console.log('🔍 [PRODUCTION] Order records for', orderId, ':', orderRecords);
      return orderRecords;
    }

    // Group productions by date and aggregate data (for dashboard view)
    const groupedByDate = {};
    
    results.forEach(production => {
      const dateKey = production.date.toISOString().split('T')[0];
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          id: production.id,
          date: dateKey,
          blowRoom: 0,
          carding: 0,
          drawing: 0,
          framing: 0,
          simplex: 0,
          spinning: 0,
          autoconer: 0,
          total: 0,
          order: production.order,
          created_at: production.createdAt,
          updated_at: production.updatedAt || production.createdAt,
          created_by: production.createdBy
        };
      }
      
      // If this is a master record, use its total value
      if (production.section === 'master') {
        groupedByDate[dateKey].total = Number(production.value || 0);
      } else {
        // For individual section records, add to the respective section total
        let sectionKey = production.section.toLowerCase();
        
        // Map section names to the expected keys
        const sectionMapping = {
          'blow_room': 'blowRoom',
          'carding': 'carding',
          'drawing': 'drawing',
          'framing': 'framing',
          'simplex': 'simplex',
          'spinning': 'spinning',
          'autoconer': 'autoconer'
        };
        
        const mappedKey = sectionMapping[sectionKey];
        if (mappedKey && groupedByDate[dateKey].hasOwnProperty(mappedKey)) {
          groupedByDate[dateKey][mappedKey] += Number(production.value || 0);
          console.log(`🔍 [PRODUCTION] Added ${production.value} to ${mappedKey} for date ${dateKey}`);
        }
      }
    });

    // Convert grouped data to array format that matches frontend expectations
    const aggregatedResults = Object.values(groupedByDate).map(entry => {
      // Create the structure that the frontend expects
      const result = {
        id: entry.id,
        date: entry.date,
        total: entry.total,
        order: entry.order,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        created_by: entry.created_by,
        creator: { name: 'User', email: 'user@example.com' } // Default creator info
      };

      // For each section, create an array with a single entry representing the total
      // This maintains compatibility with the frontend's expected structure
      result.blow_room = entry.blowRoom > 0 ? [{
        machine: 'BlowRoom',
        shift: 'A',
        production_kg: entry.blowRoom,
        order_id: entry.order?.id || ''
      }] : [];
      
      result.carding = entry.carding > 0 ? [{
        machine: 'Carding-1',
        shift: 'A',
        production_kg: entry.carding,
        order_id: entry.order?.id || ''
      }] : [];
      
      result.drawing = entry.drawing > 0 ? [{
        machine: 'Drawing-1',
        shift: 'A',
        production_kg: entry.drawing,
        order_id: entry.order?.id || ''
      }] : [];
      
      result.framing = entry.framing > 0 ? [{
        machine: 'Framing-1',
        shift: 'A',
        production_kg: entry.framing,
        order_id: entry.order?.id || ''
      }] : [];
      
      result.simplex = entry.simplex > 0 ? [{
        machine: 'Simplex-1',
        shift: 'A',
        production_kg: entry.simplex,
        order_id: entry.order?.id || ''
      }] : [];
      
      result.spinning = entry.spinning > 0 ? [{
        machine: 'Spinning-1',
        shift: 'A',
        production_kg: entry.spinning,
        order_id: entry.order?.id || ''
      }] : [];
      
      result.autoconer = entry.autoconer > 0 ? [{
        machine: 'Autoconer-1',
        shift: 'A',
        production_kg: entry.autoconer,
        order_id: entry.order?.id || ''
      }] : [];

      return result;
    });

    console.log('🔍 [PRODUCTION] Aggregated results:', aggregatedResults);
    console.log('🔍 [PRODUCTION] Final grouped data:', groupedByDate);
    console.log('🔍 [PRODUCTION] Sample result structure:', aggregatedResults[0] ? {
      id: aggregatedResults[0].id,
      date: aggregatedResults[0].date,
      blow_room_length: aggregatedResults[0].blow_room?.length,
      carding_length: aggregatedResults[0].carding?.length,
      spinning_length: aggregatedResults[0].spinning?.length,
      autoconer_length: aggregatedResults[0].autoconer?.length,
      total: aggregatedResults[0].total
    } : 'No results');

    return aggregatedResults;
  } catch (error) {
    console.error('❌ [PRODUCTION] Error in getAllProductions:', error);
    console.error('❌ [PRODUCTION] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    throw new Error(`Failed to fetch productions: ${error.message}`);
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

exports.getDailySummary = async (tenantId, date) => {
  return await prisma.productionLog.aggregate({
    where: {
      production: { tenantId },
      logDate: new Date(date),
    },
    _sum: { outputKg: true },
  });
};

exports.getMachineSummary = async (tenantId) => {
  return await prisma.productionLog.groupBy({
    by: ['machineId'],
    where: {
      production: { tenantId },
    },
    _sum: { outputKg: true },
    orderBy: {
      _sum: { outputKg: 'desc' },
    },
  });
};


//
// ==========================
// ✅ ANALYTICS & EFFICIENCY
// ==========================
//

exports.getDailyEfficiency = async (tenantId) => {
  const productions = await prisma.production.findMany({
    where: { tenantId },
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

exports.getMachineEfficiency = async (tenantId) => {
  const productions = await prisma.production.findMany({
    where: { tenantId }
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

exports.getProductionAnalytics = async (tenantId) => {
  const productions = await prisma.production.findMany({
    where: { tenantId }
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

exports.getProductionLogs = async (tenantId) => {
    return await prisma.productionLog.findMany({
      where: {
        production: {
          tenantId,
        },
      },
      orderBy: {
        logDate: 'desc',
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

exports.getCumulativeProgressByOrder = async (orderId) => {
    const order = await prisma.order.findUnique({
    where: { id: orderId }
    });
  
    if (!order) throw new Error('Order not found');
  
  const productions = await prisma.production.findMany({
    where: { orderId },
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

  // Calculate section-wise progress based on actual production records
  productions.forEach(prod => {
    const section = prod.section?.toLowerCase().replace(' ', '_');
    if (section && sectionProgress[section]) {
      const productionKg = Number(prod.value || 0);
      sectionProgress[section].total_produced += productionKg;
      sectionProgress[section].entries.push({
        date: prod.date,
        machine: prod.section,
        shift: prod.shift,
        production_kg: productionKg
      });
    }
  });

  // Calculate overall progress
  const totalProduced = Object.values(sectionProgress)
    .reduce((sum, section) => sum + section.total_produced, 0);
  const totalRequired = Number(order.quantity || 0);
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
      total: Number(p.value || 0)
    }))
    };
  };

// Delete production entry
exports.deleteProduction = async (id, user) => {
  try {
    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new Error('Unauthorized: Missing tenant ID');
    }

    // Check if production exists and belongs to the tenant
    const production = await prisma.production.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!production) {
      throw new Error('Production entry not found');
    }

    // Delete the production entry
    await prisma.production.delete({
      where: {
        id
      }
    });

    console.log('✅ [PRODUCTION] Successfully deleted production:', {
      id,
      date: production.date,
      tenantId
    });

    return { success: true, message: 'Production entry deleted successfully' };
  } catch (error) {
    console.error('❌ [PRODUCTION] Error deleting production:', error);
    throw error;
  }
};

// Save production data (for Save and Continue functionality)
exports.saveProductionDraft = async (data, user) => {
  const tenantId = user?.tenantId;
  if (!tenantId) {
    throw new Error('Unauthorized: Missing tenant ID');
  }
  
  // This function saves data as a draft/partial entry
  // It will be consolidated when the final submit is called
  return exports.createOrUpdateProduction(data, tenantId, user.id);
};

// PUBLIC: Create production (wrapper for REST controller)
exports.createProduction = async (data, user) => {
  const tenantId = user?.tenantId;
  if (!tenantId) {
    throw new Error('Unauthorized: Missing tenant ID');
  }
  return exports.createOrUpdateProduction(data, tenantId, user.id);
};