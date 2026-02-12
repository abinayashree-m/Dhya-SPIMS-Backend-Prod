const { prisma } = require('../prisma/client');

// ✅ Create a new shade with fibres and raw cotton composition
const createShade = async (data, tenantId) => {
  try {
    const { blend_composition = [], raw_cotton_compositions = [], ...shadeData } = data;

    // Map snake_case to camelCase field names
    const mappedShadeData = {
      shadeCode: shadeData.shade_code,
      shadeName: shadeData.shade_name,
      percentage: shadeData.percentage,
      description: shadeData.description
    };

    // Create the shade with fibres and cotton compositions
    const shade = await prisma.shade.create({
      data: {
        ...mappedShadeData,
        tenantId: tenantId,
        shadeFibres: blend_composition.length > 0 ? {
          create: blend_composition.map(fibre => ({
            fibreId: fibre.fibre_id,
            percentage: fibre.percentage
          }))
        } : undefined,
        rawCottonCompositions: raw_cotton_compositions.length > 0 ? {
          create: await Promise.all(raw_cotton_compositions.map(async (composition) => {
            // Create a new cotton record for RAW COTTON
            const cotton = await prisma.cotton.create({
              data: {
                lotNumber: composition.lot_number || 'DEFAULT',
                grade: composition.grade || 'DEFAULT',
                source: composition.source || 'DEFAULT',
                notes: composition.notes || 'Default cotton record'
              }
            });
            
            return {
              percentage: composition.percentage,
              cotton: {
                connect: { id: cotton.id }
              }
            };
          }))
        } : undefined
      },
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
    });

    return shade;
  } catch (error) {
    console.error('Error creating shade:', error);
    throw new Error(error.message || 'Failed to create shade');
  }
};

// ✅ Update a shade and replace its fibre composition
async function updateShade(id, data, tenantId) {
  try {
    const { blend_composition, ...updateData } = data;

    // Map snake_case to camelCase field names
    const mappedUpdateData = {
      shadeCode: updateData.shade_code,
      shadeName: updateData.shade_name,
      percentage: updateData.percentage,
      description: updateData.description
    };

    // Update the shade
    const shade = await prisma.shade.update({
      where: { 
        id,
        tenantId: tenantId
      },
      data: mappedUpdateData
    });

    // Update fibres if provided
    if (blend_composition) {
      // Delete existing fibres
      await prisma.shadeFibre.deleteMany({
        where: { shadeId: id }
      });

      // Create new fibres
      if (blend_composition.length > 0) {
        await Promise.all(
          blend_composition.map(fibre =>
            prisma.shadeFibre.create({
              data: {
                shadeId: id,
                fibreId: fibre.fibre_id,
                percentage: fibre.percentage
              }
            })
          )
        );
      }
    }

    return shade;
  } catch (error) {
    throw new Error('Failed to update shade');
  }
}

// ✅ Get all shades
const getAllShades = async (tenantId) => {
  try {
    const shades = await prisma.shade.findMany({
      where: {
        tenantId: tenantId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        shadeFibres: {
          include: {
            fibre: {
              include: {
                category: true
              }
            }
          }
        },
        rawCottonCompositions: {
          include: {
            cotton: true
          }
        }
      }
    });

    // Transform the response to include blend_composition with snake_case field names
    return shades.map(shade => ({
      id: shade.id,
      shade_code: shade.shadeCode,
      shade_name: shade.shadeName,
      percentage: shade.percentage,
      description: shade.description,
      createdAt: shade.createdAt,
      updatedAt: shade.updatedAt,
      tenantId: shade.tenantId,
      blend_composition: shade.shadeFibres.map(fibre => ({
        fibre_id: fibre.fibreId,
        percentage: fibre.percentage,
        fibre: {
          ...fibre.fibre,
          category: fibre.fibre.category
        }
      })),
      raw_cotton_compositions: shade.rawCottonCompositions.map(composition => ({
        percentage: composition.percentage,
        lot_number: composition.cotton?.lotNumber,
        grade: composition.cotton?.grade,
        source: composition.cotton?.source,
        notes: composition.cotton?.notes
      }))
    }));
  } catch (error) {
    console.error('Error fetching shades:', error);
    throw new Error('Failed to fetch shades');
  }
};

// ✅ Get shade by ID
const getShadeById = async (id, tenantId) => {
  try {
    const shade = await prisma.shade.findUnique({
      where: { 
        id,
        tenantId: tenantId
      },
      include: {
        shadeFibres: {
          include: {
            fibre: {
              include: {
                category: true
              }
            }
          }
        },
        rawCottonCompositions: {
          include: {
            cotton: true
          }
        }
      }
    });

    if (!shade) {
      throw new Error('Shade not found');
    }

    // Transform the response to include blend_composition with snake_case field names
    return {
      id: shade.id,
      shade_code: shade.shadeCode,
      shade_name: shade.shadeName,
      percentage: shade.percentage,
      description: shade.description,
      createdAt: shade.createdAt,
      updatedAt: shade.updatedAt,
      tenantId: shade.tenantId,
      blend_composition: shade.shadeFibres.map(fibre => ({
        fibre_id: fibre.fibreId,
        percentage: fibre.percentage,
        fibre: {
          ...fibre.fibre,
          category: fibre.fibre.category
        }
      })),
      raw_cotton_compositions: shade.rawCottonCompositions.map(composition => ({
        percentage: composition.percentage,
        lot_number: composition.cotton?.lotNumber,
        grade: composition.cotton?.grade,
        source: composition.cotton?.source,
        notes: composition.cotton?.notes
      }))
    };
  } catch (error) {
    console.error('Error fetching shade:', error);
    throw new Error(error.message || 'Failed to fetch shade');
  }
};

// ✅ Delete shade and its composition
const deleteShade = async (id, tenantId) => {
  try {
    // Delete associated shade-fibre relationships (not the fibres themselves)
    await prisma.shadeFibre.deleteMany({
      where: { shadeId: id }
    });
    // Delete associated raw cotton compositions
    await prisma.rawCottonComposition.deleteMany({
      where: { shadeId: id }
    });
    // Delete the shade
    return await prisma.shade.delete({
      where: { 
        id,
        tenantId: tenantId
      }
    });
  } catch (error) {
    console.error('Error deleting shade:', error);
    // Preserve the original error structure for proper handling
    if (error.code === 'P2003') {
      throw error; // Re-throw the original Prisma error
    }
    throw new Error(error.message || 'Failed to delete shade');
  }
};

// ✅ Optional: Shade stock summary
const getShadeStockSummary = async () => {
  return await prisma.shade.groupBy({
    by: ['id'],
    _count: {
      id: true,
    },
    orderBy: {
      id: 'desc',
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