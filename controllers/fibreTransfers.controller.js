const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /fibreTransfers?status=pending
exports.getFibreTransfers = async (req, res) => {
  try {
    const { status } = req.query;

    const transfers = await prisma.fibre_transfers.findMany({
      where: status ? { returned_kg: null } : {}, // status not defined in schema, using returned_kg to infer pending
      include: {
        fibre: true,
        supplier: true,
      },
      orderBy: {
        sent_date: 'desc',
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
        fibre_id,
        supplier_id,
        sent_kg,
        sent_date = new Date().toISOString(),
        expected_return = null,
        notes = '',
      } = req.body;
  
      if (!fibre_id || !supplier_id || !sent_kg) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      const created = await prisma.fibre_transfers.create({
        data: {
          fibre_id,
          supplier_id,
          sent_kg: Number(sent_kg), // ensures it's a number
          sent_date: new Date(sent_date),
          expected_return: expected_return ? new Date(expected_return) : null,
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
// PUT /fibreTransfers/:id/receive
exports.updateReceived = async (req, res) => {
    try {
      const { id } = req.params;
      const { received_qty, received_date, remarks } = req.body;
  
      const returnDateTime = new Date(received_date).toISOString(); // ✅ Fix here
  
      const updated = await prisma.fibre_transfers.update({
        where: { id },
        data: {
          returned_kg: received_qty,
          return_date: returnDateTime,
          notes: remarks,
        },
      });
  
      res.status(200).json(updated);
    } catch (error) {
      console.error('❌ Error updating fibre transfer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };