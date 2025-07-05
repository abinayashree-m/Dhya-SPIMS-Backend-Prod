const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create a new shade with fibres and raw cotton composition
const createShade = async (data) => {
  try {
    const { fibres = [], rawCottonCompositions = [], ...shadeData } = data;

    // Create the shade with fibres and cotton compositions
    const shade = await prisma.shade.create({
      data: {
        ...shadeData,
        shadeFibres: fibres.length > 0 ? {
          create: fibres.map(fibre => ({
            fibreId: fibre.fibreId,
            percentage: fibre.percentage
          }))
        } : undefined,
        rawCottonCompositions: rawCottonCompositions.length > 0 ? {
          create: await Promise.all(rawCottonCompositions.map(async (composition) => {
            // Create cotton record if it doesn't exist
            const cotton = await prisma.cotton.upsert({
              where: { id: composition.cottonId || 'temp' },
              update: {},
              create: {
                lotNumber: composition.lotNumber || 'DEFAULT',
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
async function updateShade(id, data) {
  try {
    const { fibres, ...updateData } = data;

    // Update the shade
    const shade = await prisma.shade.update({
      where: { id },
      data: updateData
    });

    // Update fibres if provided
    if (fibres) {
      // Delete existing fibres
      await prisma.shadeFibre.deleteMany({
        where: { shadeId: id }
      });

      // Create new fibres
      if (fibres.length > 0) {
        await Promise.all(
          fibres.map(fibre =>
            prisma.shadeFibre.create({
              data: {
                shadeId: id,
                fibreId: fibre.fibreId,
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
    const shades = await prisma.shade.findMany({
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

    // Transform the response to include blend_composition
    return shades.map(shade => ({
      ...shade,
      blendComposition: shade.shadeFibres.map(fibre => ({
        fibreId: fibre.fibreId,
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
    const shade = await prisma.shade.findUnique({
      where: { id },
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

    if (!shade) {
      throw new Error('Shade not found');
    }

    // Transform the response to include blend_composition
    return {
      ...shade,
      blendComposition: shade.shadeFibres.map(fibre => ({
        fibreId: fibre.fibreId,
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
    await prisma.shadeFibre.deleteMany({
      where: { shadeId: id }
    });

    // Delete associated raw cotton compositions
    await prisma.rawCottonComposition.deleteMany({
      where: { shadeId: id }
    });

    // Delete the shade
    return await prisma.shade.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Error deleting shade:', error);
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