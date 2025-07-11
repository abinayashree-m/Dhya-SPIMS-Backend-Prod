const purchaseOrderService = require('../services/purchaseOrders.service');

exports.getAllPurchaseOrders = async (req, res) => {
  try {
    // Extract pagination and filter parameters from query
    const {
      page = 1,
      limit = 5,
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
    const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
    const validSortBy = ['createdAt', 'poNumber', 'buyerName', 'status', 'grandTotal'].includes(sortBy) ? sortBy : 'createdAt';

    const options = {
      page: pageNum,
      limit: limitNum,
      search: search.trim(),
      status: status.trim(),
      sortBy: validSortBy,
      sortOrder: validSortOrder
    };

    const result = await purchaseOrderService.getAll(req.user, options);

    if (!result.data || result.data.length === 0) {
      return res.status(200).json({
        message: 'No data available',
        data: [],
        pagination: result.pagination
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await purchaseOrderService.getById(id, req.user);
    if (!data) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const data = await purchaseOrderService.create(req.body, req.user);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await purchaseOrderService.update(id, req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  try {
    await purchaseOrderService.remove(id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.verify = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await purchaseOrderService.verify(id, req.user);
    res.json(result);
  } catch (err) {
    console.error('PO Verification Error:', err);
    res.status(400).json({ 
      error: err.message,
      details: err.stack,
      code: err.code || 'VERIFICATION_ERROR'
    });
  }
};

exports.convert = async (req, res) => {
  const { id } = req.params;
  try {
    const salesOrder = await purchaseOrderService.convertToSalesOrder(id, req.user, req.body);
    res.status(201).json(salesOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.parseAndCreatePurchaseOrder = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const poData = await purchaseOrderService.parseFileAndCreate(req.file, req.user);
    res.status(201).json(poData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process purchase order.' });
  }
};