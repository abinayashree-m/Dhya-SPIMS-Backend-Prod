//pullable request
const registerService = require('../services/register.service');

exports.register = async (req, res) => {
  try {
    const { tenantName, domain, adminName, email, password, roles } = req.body;

    if (!tenantName || !adminName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await registerService.registerTenantWithAdmin({
      tenantName,
      domain,
      adminName,
      email,
      password,
      roles,
    });

    res.status(201).json({
      message: 'Tenant, admin, and roles created successfully',
      tenantId: result.tenantId,
      adminUserId: result.adminUserId,
      roles: result.roles,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
