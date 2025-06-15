const productionService = require('../services/production.service');
// 🔁 GET /productions
exports.getAllProductions = async (req, res) => {
  try {
    console.log('[Production API] User object:', req.user);
    const tenant_id = req.user?.tenantId;
    const { order_id } = req.query;
    
    if (!tenant_id) {
      console.error('[Production API] Error: No tenant_id found in user object');
      return res.status(401).json({ error: 'Unauthorized: No tenant ID found' });
    }

    const productions = await productionService.getAllProductions(tenant_id, order_id);
    res.json(productions);
  } catch (err) {
    console.error('[Production API] Error fetching productions:', err);
    res.status(500).json({ error: 'Failed to fetch productions' });
  }
};

exports.getOrderProgress = async (req, res) => {
  const { orderId } = req.params;
  try {
    const data = await productionService.getCumulativeProgressByOrder(orderId);
    return res.json(data);
  } catch (err) {
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
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
};

exports.getDailyEfficiency = async (req, res) => {
  try {
    const data = await productionService.getDailyEfficiency(req.user.tenant_id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate efficiency' });
  }
};

exports.getMachineEfficiency = async (req, res) => {
  try {
    const data = await productionService.getMachineEfficiency(req.user.tenant_id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate machine efficiency' });
  }
};

// Helper function for consistent error responses
const errorResponse = (res, status, message) => {
  res.status(status).json({
    error: message,
    code: status
  });
};

// Get production by date
exports.getProductionByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const productions = await productionService.getProductionByDate(date, req.user.tenantId);
    res.json(productions);
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Create production entry
exports.createProduction = async (req, res) => {
  try {
    console.log('[Production API] Incoming createProduction data:', req.body);
    const production = await productionService.createProduction(req.body, req.user);
    console.log('[Production API] Response for createProduction:', production);
    res.status(201).json(production);
  } catch (err) {
    if (err.message.includes('already exists')) {
      errorResponse(res, 409, err.message);
    } else {
      errorResponse(res, 400, err.message);
    }
  }
};

// Update production entry
exports.updateProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant_id = req.user?.tenantId;

    if (!tenant_id) {
      console.error('[Production API] Error: No tenant_id found in user object');
      return res.status(401).json({ error: 'Unauthorized: No tenant ID found' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Production ID is required' });
    }

    console.log('[Production API] Incoming updateProduction data:', {
      id,
      tenant_id,
      data: req.body
    });

    const production = await productionService.updateProduction(id, req.body, req.user);
    
    console.log('[Production API] Response for updateProduction:', {
      id: production.id,
      date: production.date,
      total: production.total
    });

    res.json(production);
  } catch (err) {
    console.error('[Production API] Error updating production:', err);
    
    if (err.message.includes('not found')) {
      errorResponse(res, 404, err.message);
    } else if (err.message.includes('missing required fields')) {
      errorResponse(res, 400, err.message);
    } else if (err.message.includes('invalid')) {
      errorResponse(res, 400, err.message);
    } else {
      errorResponse(res, 500, 'Failed to update production');
    }
  }
};

// Delete production entry
exports.deleteProduction = async (req, res) => {
  try {
    const { id } = req.params;
    await productionService.deleteProduction(id, req.user);
    res.status(204).end();
  } catch (err) {
    if (err.message.includes('not found')) {
      errorResponse(res, 404, err.message);
    } else {
      errorResponse(res, 400, err.message);
    }
  }
};

// List all production entries
exports.listProductions = async (req, res) => {
  try {
    const { startDate, endDate, page, limit } = req.query;
    const result = await productionService.listProductions(req.user, {
      startDate,
      endDate,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });
    res.json(result);
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};