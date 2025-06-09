const purchaseOrderService = require('../services/purchaseOrders.service');

exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const purchaseOrders = await purchaseOrderService.getAll(req.user);

    if (!purchaseOrders || purchaseOrders.length === 0) {
      console.log('📭 No purchase orders found for tenant:', req.user?.tenant_id);
      return res.status(200).json({ message: 'No data available', data: [] });
    }

    res.status(200).json(purchaseOrders);
  } catch (error) {
    console.error('❌ Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  const { id } = req.params;
  console.log(`📥 [GET] /purchase-orders/${id} - Fetching PO`);
  try {
    const data = await purchaseOrderService.getById(id, req.user);
    if (!data) {
      console.warn(`⚠️ Purchase order not found: ID=${id}`);
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    console.log(`✅ Found purchase order: ID=${id}`);
    res.json(data);
  } catch (err) {
    console.error(`❌ Error fetching purchase order by ID=${id}:`, err);
    res.status(500).json({ error: err.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  console.log('📥 [POST] /purchase-orders - Creating new PO');
  console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
  try {
    const data = await purchaseOrderService.create(req.body, req.user);
    console.log(`✅ Created purchase order: ID=${data.id}, Items=${data.items.length}`);
    res.status(201).json(data);
  } catch (err) {
    console.error('❌ Error creating purchase order:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  console.log(`📥 [PUT] /purchase-orders/${id} - Updating PO`);
  console.log('📝 Updated Data:', JSON.stringify(req.body, null, 2));
  try {
    const data = await purchaseOrderService.update(id, req.body);
    console.log(`✅ Updated purchase order: ID=${id}, Items=${data.items.length}`);
    res.json(data);
  } catch (err) {
    console.error(`❌ Error updating purchase order ID=${id}:`, err);
    res.status(400).json({ error: err.message });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ [DELETE] /purchase-orders/${id} - Deleting PO`);
  try {
    await purchaseOrderService.remove(id);
    console.log(`✅ Deleted purchase order: ID=${id}`);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(`❌ Error deleting purchase order ID=${id}:`, err);
    res.status(400).json({ error: err.message });
  }
};

exports.verify = async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [POST] /purchase-orders/${id}/verify - Verifying PO`);
  try {
    const result = await purchaseOrderService.verify(id, req.user);
    console.log(`✅ Purchase order verified: ID=${id}`);
    res.json(result);
  } catch (err) {
    console.error(`❌ Error verifying purchase order ID=${id}:`, err);
    res.status(400).json({ error: err.message });
  }
};

exports.convert = async (req, res) => {
  const { id } = req.params;
  console.log(`🔄 [POST] /purchase-orders/${id}/convert - Converting PO to Sales Order`);
  console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
  console.log('👤 User:', JSON.stringify(req.user, null, 2));
  try {
    const salesOrder = await purchaseOrderService.convertToSalesOrder(id, req.user, req.body);
    console.log(`✅ PO converted to Sales Order: ID=${salesOrder.id}`);
    res.status(201).json(salesOrder);
  } catch (err) {
    console.error(`❌ Error converting purchase order ID=${id}:`, err);
    res.status(400).json({ error: err.message });
  }
};

exports.parseAndCreatePurchaseOrder = async (req, res) => {
  console.log('📥 [POST] /purchase-orders/upload-and-parse - New file received');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const poData = await purchaseOrderService.parseFileAndCreate(req.file, req.user);
    console.log(`✅ File parsed and PO created: ID=${poData.id}`);
    res.status(201).json(poData);
  } catch (error) {
    console.error('❌ Error in parsing and creation flow:', error.message);
    res.status(500).json({ error: 'Failed to process purchase order.' });
  }
};