const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /fibreTransfers?status=pending
exports.getFibreTransfers = async (req, res) => {
  try {
    const { status } = req.query;

    const transfers = await prisma.fibreTransfer.findMany({
      where: status ? { returnedKg: null } : {}, // status not defined in schema, using returnedKg to infer pending
      include: {
        fibre: true,
        supplier: true,
      },
      orderBy: {
        sentDate: 'desc',
      },
    });

    res.status(200).json(transfers);
  } catch (error) {
    console.error('❌ Error fetching fibre transfers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /fibreTransfers
exports.createTransfer = async (req, res) => {
    try {
      const {
        fibreId,
        supplierId,
        sentKg,
        sentDate = new Date().toISOString(),
        expectedReturn = null,
        notes = '',
      } = req.body;
  
      if (!fibreId || !supplierId || !sentKg) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      const created = await prisma.fibreTransfer.create({
        data: {
          fibreId,
          supplierId,
          sentKg: Number(sentKg), // ensures it's a number
          sentDate: new Date(sentDate),
          expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
          notes,
        },
      });
  
      res.status(201).json(created);
    } catch (error) {
      console.error('❌ Error creating fibre transfer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

// PUT /fibreTransfers/:id/receive
exports.updateReceived = async (req, res) => {
    try {
      const { id } = req.params;
      const { received_qty, received_date, remarks } = req.body;
  
      const returnDateTime = new Date(received_date).toISOString(); // ✅ Fix here
  
      const updated = await prisma.fibreTransfer.update({
        where: { id },
        data: {
          returnedKg: received_qty,
          returnDate: returnDateTime,
          notes: remarks,
        },
      });
  
      res.status(200).json(updated);
    } catch (error) {
      console.error('❌ Error updating fibre transfer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };