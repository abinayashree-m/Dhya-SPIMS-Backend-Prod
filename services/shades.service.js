const { Decimal } = require('@prisma/client/runtime/library');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create a new shade with multiple fibre compositions
const createShade = async (data) => {
  console.log('🔍 [createShade] Input data:', JSON.stringify(data, null, 2));
  
  const { 
    fibre_composition = [], 
    raw_cotton_composition = [], 
    available_stock_kg, // Ignore this field as it's not in schema
    percentage, // Ignore this field as it's calculated from compositions
    ...rest 
  } = data;

  console.log('🔍 [createShade] Destructured data:', {
    fibre_composition,
    raw_cotton_composition,
    rest
  });

  // Convert raw_cotton_composition to array if it's an object
  const rawCottonArray = Array.isArray(raw_cotton_composition) 
    ? raw_cotton_composition 
    : raw_cotton_composition 
      ? [raw_cotton_composition] 
      : [];

  console.log('🔍 [createShade] Converted raw_cotton_composition:', rawCottonArray);

  // Calculate totals
  const fibreTotal = fibre_composition.reduce((sum, f) => sum + Number(f.percentage || 0), 0);
  const rawTotal = rawCottonArray.reduce((sum, r) => sum + Number(r.percentage || 0), 0);
  const totalPercentage = fibreTotal + rawTotal;
  
  console.log('🔍 [createShade] Percentage calculations:', {
    fibreTotal,
    rawTotal,
    totalPercentage
  });

  if (Math.abs(totalPercentage - 100) > 0.01) { // Allow for small floating point differences
    throw new Error(`Invalid % sum: ${totalPercentage}. Combined fibre + raw_cotton must equal 100.`);
  }

  try {
    console.log('🔍 [createShade] Creating shade with data:', {
      ...rest,
      percentage: `${totalPercentage}%`
    });

    // Create the shade with all related data in a single transaction
    const shade = await prisma.$transaction(async (tx) => {
      // 1. Create the shade
      const newShade = await tx.shades.create({ 
        data: { 
          ...rest,
          percentage: `${totalPercentage}%` // Store the total percentage
        } 
      });

      console.log('✅ [createShade] Shade created:', newShade);

      // 2. Create fibre compositions if any
      if (fibre_composition.length > 0) {
        const entries = fibre_composition
          .filter(f => f.fibre_id && !isNaN(f.percentage))
          .map(f => ({
            shade_id: newShade.id,
            fibre_id: f.fibre_id,
            percentage: new Decimal(f.percentage),
          }));

        console.log('🔍 [createShade] Creating fibre compositions:', entries);
        await tx.shade_fibres.createMany({ data: entries, skipDuplicates: true });
      }

      // 3. Create raw cotton entries if any
      if (rawCottonArray.length > 0) {
        for (const r of rawCottonArray) {
          // Create a new cotton record
          const cotton = await tx.cottons.create({
            data: {}
          });

          const rawCottonData = {
            shade: {
              connect: { id: newShade.id }
            },
            cotton: {
              connect: { id: cotton.id }
            },
            percentage: new Decimal(r.percentage)
          };
          console.log('🔍 [createShade] Creating raw cotton entry:', rawCottonData);
          await tx.raw_cotton_compositions.create({
            data: rawCottonData
          });
        }
      }

      return newShade;
    });

    const result = await getShadeById(shade.id);
    console.log('✅ [createShade] Final result:', result);
    return result;
  } catch (error) {
    console.error('❌ [createShade] Error:', error);
    console.error('❌ [createShade] Error stack:', error.stack);
    if (error.code === 'P2002') {
      throw new Error('A shade with this code already exists');
    }
    throw error;
  }
};

// ✅ Update a shade and replace its fibre composition
async function updateShade(id, data) {
  console.log('🔍 [updateShade] Starting update for shade:', {
    id,
    data: JSON.stringify(data, null, 2)
  });

  const {
    fibre_composition = [],
    raw_cotton_composition = [], // may come as object instead of array
    ...rest
  } = data;

  console.log('🔍 [updateShade] Destructured data:', {
    fibre_composition,
    raw_cotton_composition,
    rest: JSON.stringify(rest, null, 2)
  });

  const rawCottonArray = Array.isArray(raw_cotton_composition)
    ? raw_cotton_composition
    : raw_cotton_composition
    ? [raw_cotton_composition]
    : [];

  console.log('🔍 [updateShade] Normalized raw cotton array:', rawCottonArray);

  try {
    // Update base shade
    console.log('🔍 [updateShade] Updating base shade data...');
    const updatedShade = await prisma.shades.update({
      where: { id },
      data: { ...rest },
    });
    console.log('✅ [updateShade] Base shade updated:', {
      id: updatedShade.id,
      shade_code: updatedShade.shade_code
    });

    // Replace fibre compositions
    console.log('🔍 [updateShade] Deleting existing fibre compositions...');
    await prisma.shade_fibres.deleteMany({ where: { shade_id: id } });
    console.log('✅ [updateShade] Existing fibre compositions deleted');

    const fibreData = fibre_composition
      .filter(f => f.fibre_id && !isNaN(f.percentage))
      .map(f => ({
        shade_id: id,
        fibre_id: f.fibre_id,
        percentage: new Decimal(f.percentage),
      }));

    console.log('🔍 [updateShade] Creating new fibre compositions:', fibreData);
    await prisma.shade_fibres.createMany({ data: fibreData, skipDuplicates: true });
    console.log('✅ [updateShade] New fibre compositions created');

    // Update raw cotton entries
    console.log('🔍 [updateShade] Processing raw cotton updates...');
    
    // 1. Get existing compositions
    const existingCompositions = await prisma.raw_cotton_compositions.findMany({
      where: { shade_id: id },
      include: { cotton: true }
    });
    console.log('🔍 [updateShade] Existing compositions:', existingCompositions);

    // 2. Delete all existing compositions
    console.log('🔍 [updateShade] Deleting existing compositions...');
    await prisma.raw_cotton_compositions.deleteMany({
      where: { shade_id: id }
    });
    console.log('✅ [updateShade] Existing compositions deleted');

    // 3. Create new cotton records and compositions
    console.log('🔍 [updateShade] Creating new cotton records and compositions...');
    for (const r of rawCottonArray) {
      // Create a new cotton record
      const cotton = await prisma.cottons.create({
        data: {
          lot_number: r.lot_number || 'default',
          stock_kg: r.stock_kg ? new Decimal(r.stock_kg) : undefined,
          grade: r.grade,
          source: r.source,
          notes: r.notes
        }
      });
      console.log('✅ [updateShade] Created cotton record:', cotton);

      // Create the composition
      await prisma.raw_cotton_compositions.create({
        data: {
          shade_id: id,
          cotton_id: cotton.id,
          percentage: new Decimal(r.percentage)
        }
      });
      console.log('✅ [updateShade] Created composition for cotton:', cotton.id);
    }

    const result = await getShadeById(id);
    console.log('✅ [updateShade] Final result:', {
      id: result.id,
      shade_code: result.shade_code,
      fibre_count: result.blend_composition.length,
      raw_cotton_count: result.raw_cotton_compositions.length
    });

    return result;
  } catch (error) {
    console.error('❌ [updateShade] Error:', error);
    console.error('❌ [updateShade] Error stack:', error.stack);
    throw error;
  }
}

// ✅ Get all shades (optionally filtered by fibre)
const getAllShades = async ({ fibre_id } = {}) => {
  console.log('🔍 [getAllShades] Query params:', { fibre_id });

  const raw = await prisma.shades.findMany({
    where: fibre_id ? { shade_fibres: { some: { fibre_id } } } : {},
    orderBy: { created_at: 'desc' },
    include: {
      shade_fibres: { include: { fibre: true } },
      raw_cotton_compositions: {
        include: {
          cotton: true
        }
      },
    },
  });

  console.log('✅ [getAllShades] Found shades:', raw.length);

  const result = raw.map(shade => {
    // Calculate total percentage
    const fibreTotal = shade.shade_fibres.reduce((sum, sf) => sum + Number(sf.percentage), 0);
    const rawCottonTotal = shade.raw_cotton_compositions.reduce((sum, rc) => sum + Number(rc.percentage), 0);
    const totalPercentage = fibreTotal + rawCottonTotal;

    console.log('🔍 [getAllShades] Processing shade:', {
      id: shade.id,
      shade_code: shade.shade_code,
      fibreCount: shade.shade_fibres.length,
      fibreDetails: shade.shade_fibres.map(sf => ({
        id: sf.id,
        fibre_id: sf.fibre_id,
        fibre_name: sf.fibre.fibre_name,
        percentage: sf.percentage
      })),
      rawCottonCount: shade.raw_cotton_compositions.length,
      rawCottonDetails: shade.raw_cotton_compositions.map(rc => ({
        id: rc.id,
        percentage: rc.percentage,
        cotton_id: rc.cotton_id
      })),
      totalPercentage,
      isValid: Math.abs(totalPercentage - 100) <= 0.01 // Allow for small floating point differences
    });

    return {
      ...shade,
      blend_composition: shade.shade_fibres,
      raw_cotton_compositions: shade.raw_cotton_compositions,
      total_percentage: totalPercentage,
      is_valid: Math.abs(totalPercentage - 100) <= 0.01
    };
  });

  console.log('✅ [getAllShades] Transformed result:', {
    totalShades: result.length,
    withFibres: result.filter(s => s.blend_composition.length > 0).length,
    withRawCotton: result.filter(s => s.raw_cotton_compositions.length > 0).length,
    shadeCodes: result.map(s => s.shade_code),
    totalFibres: result.reduce((sum, s) => sum + s.blend_composition.length, 0),
    totalRawCotton: result.reduce((sum, s) => sum + s.raw_cotton_compositions.length, 0),
    validShades: result.filter(s => s.is_valid).length,
    invalidShades: result.filter(s => !s.is_valid).map(s => ({
      shade_code: s.shade_code,
      total_percentage: s.total_percentage
    }))
  });

  return result;
};

// ✅ Get shade by ID
const getShadeById = async (id) => {
  const shade = await prisma.shades.findUnique({
    where: { id },
    include: {
      shade_fibres: { include: { fibre: true } },
      raw_cotton_compositions: true,
    },
  });

  return {
    ...shade,
    blend_composition: shade.shade_fibres,
    raw_cotton_compositions: shade.raw_cotton_compositions,
  };
};

// ✅ Delete shade and its composition
const deleteShade = async (id) => {
  console.log('🔍 [deleteShade] Starting deletion for shade ID:', id);

  try {
    // First check if shade exists and get related data
    const shade = await prisma.shades.findUnique({
      where: { id },
      include: {
        shade_fibres: true,
        raw_cotton_compositions: true,
        orders: {
          select: {
            id: true,
            order_number: true,
            status: true
          }
        }
      }
    });

    if (!shade) {
      console.log('❌ [deleteShade] Shade not found:', id);
      return {
        success: false,
        error: 'Shade not found',
        code: 'SHADE_NOT_FOUND'
      };
    }

    console.log('🔍 [deleteShade] Found shade:', {
      id: shade.id,
      shade_code: shade.shade_code,
      fibre_compositions: shade.shade_fibres.length,
      raw_cotton_compositions: shade.raw_cotton_compositions.length,
      linked_orders: shade.orders.length
    });

    // Check if shade is used in any orders
    if (shade.orders.length > 0) {
      const orderDetails = shade.orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status
      }));
      
      console.log('⚠️ [deleteShade] Shade is used in orders:', orderDetails);
      return {
        success: false,
        error: `Cannot delete shade - it is used in ${shade.orders.length} order(s)`,
        code: 'SHADE_IN_USE',
        details: {
          shade_code: shade.shade_code,
          linked_orders: orderDetails
        }
      };
    }

    // Delete related records first
    console.log('🔍 [deleteShade] Deleting shade fibres...');
    await prisma.shade_fibres.deleteMany({ 
      where: { shade_id: id } 
    });
    console.log('✅ [deleteShade] Shade fibres deleted');

    console.log('🔍 [deleteShade] Deleting raw cotton compositions...');
    await prisma.raw_cotton_compositions.deleteMany({ 
      where: { shade_id: id } 
    });
    console.log('✅ [deleteShade] Raw cotton compositions deleted');

    // Finally delete the shade
    console.log('🔍 [deleteShade] Deleting shade record...');
    const deletedShade = await prisma.shades.delete({ 
      where: { id } 
    });
    console.log('✅ [deleteShade] Shade deleted successfully:', {
      id: deletedShade.id,
      shade_code: deletedShade.shade_code
    });

    return {
      success: true,
      data: {
        id: deletedShade.id,
        shade_code: deletedShade.shade_code
      }
    };
  } catch (error) {
    console.error('❌ [deleteShade] Error:', error);
    console.error('❌ [deleteShade] Error stack:', error.stack);
    return {
      success: false,
      error: 'Failed to delete shade',
      code: 'DELETE_FAILED',
      details: error.message
    };
  }
};

// ✅ Optional: Shade stock summary
const getShadeStockSummary = async () => {
  return await prisma.shades.groupBy({
    by: ['id'],
    _sum: {
      available_stock_kg: true,
    },
    orderBy: {
      _sum: {
        available_stock_kg: 'desc',
      },
    },
  });
};

module.exports = {
  createShade,
  updateShade,
  getAllShades,
  getShadeById,
  deleteShade,
  getShadeStockSummary,
};