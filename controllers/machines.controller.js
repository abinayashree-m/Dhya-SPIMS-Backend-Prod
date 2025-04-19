const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllMachines = async (req, res) => {
  const machines = await prisma.machines.findMany({
    orderBy: { created_at: 'desc' },
  });
  res.json(machines);
};

const getMachineById = async (req, res) => {
  const machine = await prisma.machines.findUnique({ where: { id: req.params.id } });
  if (!machine) return res.status(404).json({ error: 'Machine not found' });
  res.json(machine);
};

const createMachine = async (req, res) => {
  const { tenant_id, section, machine_code, description } = req.body;

  const machine = await prisma.machines.create({
    data: {
      tenant_id,
      section,
      machine_code,
      description
    }
  });

  res.status(201).json(machine);
};

const updateMachine = async (req, res) => {
  const machine = await prisma.machines.update({
    where: { id: req.params.id },
    data: req.body
  });

  res.json(machine);
};

const deactivateMachine = async (req, res) => {
  await prisma.machines.update({
    where: { id: req.params.id },
    data: { is_active: false }
  });

  res.json({ message: 'Machine deactivated' });
};

module.exports = {
  getAllMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deactivateMachine
};