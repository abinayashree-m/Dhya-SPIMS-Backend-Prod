const productionService = require('../services/production.service');
// 🔁 GET /productions
exports.getAllProductions = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const data = await productionService.getAllProductions(tenant_id);
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching productions:', err);
    res.status(500).json({ error: 'Failed to fetch productions' });
  }
};

exports.getOrderProgress = async (req, res) => {
  const { orderId } = req.params;
  try {
    const data = await productionService.getCumulativeProgressByOrder(orderId);
    return res.json(data);
  } catch (err) {
    console.error('❌ Failed to fetch progress:', err.message);
    return res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

// 🔁 GET /productions/:id
exports.getProductionById = async (req, res) => {
  try {
    const data = await productionService.getProductionById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Production not found' });
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching production by ID:', err);
    res.status(500).json({ error: 'Failed to fetch production' });
  }
};

// 📅 GET /productions/logs
exports.getProductionLogs = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const logs = await productionService.getProductionLogs(tenant_id);
    res.json(logs);
  } catch (err) {
    console.error('❌ Error fetching production logs:', err);
    res.status(500).json({ error: 'Failed to fetch production logs' });
  }
};
// 📈 GET /productions/analytics
exports.getProductionAnalytics = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const data = await productionService.getProductionAnalytics(tenant_id);
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching analytics:', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
};

exports.getDailyEfficiency = async (req, res) => {
  try {
    const data = await productionService.getDailyEfficiency(req.user.tenant_id);
    res.json(data);
  } catch (err) {
    console.error('Efficiency Error:', err);
    res.status(500).json({ error: 'Failed to calculate efficiency' });
  }
};

exports.getMachineEfficiency = async (req, res) => {
  try {
    const data = await productionService.getMachineEfficiency(req.user.tenant_id);
    res.json(data);
  } catch (err) {
    console.error('Machine Efficiency Error:', err);
    res.status(500).json({ error: 'Failed to calculate machine efficiency' });
  }
};

// ➕ POST /productions
exports.createProduction = async (req, res) => {
  try {
    const data = await productionService.createProduction(req.body);
    res.status(201).json(data);
  } catch (err) {
    console.error('❌ Error creating production:', err);
    res.status(500).json({ error: 'Failed to create production' });
  }
};

// ✏️ PUT /productions/:id
exports.updateProduction = async (req, res) => {
  try {
    const data = await productionService.updateProduction(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    console.error('❌ Error updating production:', err);
    res.status(500).json({ error: 'Failed to update production' });
  }
};

// ❌ DELETE /productions/:id
exports.deleteProduction = async (req, res) => {
  try {
    await productionService.deleteProduction(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error('❌ Error deleting production:', err);
    res.status(500).json({ error: 'Failed to delete production' });
  }
};