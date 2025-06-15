const { Decimal } = require('@prisma/client/runtime/library');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create a new shade with multiple fibre compositions
const createShade = async (data) => {
  try {
    const { shade_name, shade_code, description, blend_composition, raw_cotton_compositions, ...otherData } = data;

    // Create the shade with all its relations in a single transaction
    const shade = await prisma.shades.create({
      data: {
        shade_name,
        shade_code,
        description,
        percentage: otherData.percentage,
        // Create shade fibres if provided
        shade_fibres: blend_composition ? {
          create: blend_composition.map(fibre => ({
            fibre_id: fibre.fibre_id,
            percentage: fibre.percentage
          }))
        } : undefined,
        // Create raw cotton compositions if provided
        raw_cotton_compositions: raw_cotton_compositions ? {
          create: await Promise.all(raw_cotton_compositions.map(async (composition) => {
            // Create a default cotton record if no lot number is provided
            const cotton = await prisma.cottons.create({
              data: {
                lot_number: composition.lot_number || 'DEFAULT',
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
    });

    return shade;
  } catch (error) {
    console.error('Error creating shade:', error);
    throw new Error(error.message || 'Failed to create shade');
  }
};

// ✅ Update a shade and replace its fibre composition
async function updateShade(id, data) {
  try {
    const { fibres, ...updateData } = data;

    // Update the shade
    const shade = await prisma.shades.update({
      where: { id },
      data: updateData
    });

    // Update fibres if provided
    if (fibres) {
      // Delete existing fibres
      await prisma.shade_fibres.deleteMany({
        where: { shade_id: id }
      });

      // Create new fibres
      if (fibres.length > 0) {
        await Promise.all(
          fibres.map(fibre =>
            prisma.shade_fibres.create({
              data: {
                shade_id: id,
                fibre_id: fibre.fibre_id,
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
const getAllShades = async () => {
  try {
    const shades = await prisma.shades.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        shade_fibres: {
          include: {
            fibre: {
              include: {
                category: true
              }
            }
          }
        },
        raw_cotton_compositions: {
          include: {
            cotton: true
          }
        }
      }
    });

    // Transform the response to include blend_composition
    return shades.map(shade => ({
      ...shade,
      blend_composition: shade.shade_fibres.map(fibre => ({
        fibre_id: fibre.fibre_id,
        percentage: fibre.percentage,
        fibre: fibre.fibre
      }))
    }));
  } catch (error) {
    console.error('Error fetching shades:', error);
    throw new Error('Failed to fetch shades');
  }
};

// ✅ Get shade by ID
const getShadeById = async (id) => {
  try {
    const shade = await prisma.shades.findUnique({
      where: { id },
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
    });

    if (!shade) {
      throw new Error('Shade not found');
    }

    // Transform the response to include blend_composition
    return {
      ...shade,
      blend_composition: shade.shade_fibres.map(fibre => ({
        fibre_id: fibre.fibre_id,
        percentage: fibre.percentage,
        fibre: fibre.fibre
      }))
    };
  } catch (error) {
    console.error('Error fetching shade:', error);
    throw new Error(error.message || 'Failed to fetch shade');
  }
};

// ✅ Delete shade and its composition
const deleteShade = async (id) => {
  try {
    // Delete associated fibres first
    await prisma.shade_fibres.deleteMany({
      where: { shade_id: id }
    });

    // Delete associated raw cotton compositions
    await prisma.raw_cotton_compositions.deleteMany({
      where: { shade_id: id }
    });

    // Delete the shade
    return await prisma.shades.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Error deleting shade:', error);
    throw new Error(error.message || 'Failed to delete shade');
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