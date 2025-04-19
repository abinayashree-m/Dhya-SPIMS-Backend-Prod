const registerService = require('../services/register.service');

/**
 * @route POST /register
 * @desc Register a new tenant + admin user
 */
exports.register = async (req, res) => {
  try {
    const { tenantName, domain, adminName, email, password } = req.body;

    if (!tenantName || !adminName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tenant = await registerService.registerTenantWithAdmin({
      tenantName,
      domain,
      adminName,
      email,
      password,
    });

    res.status(201).json({
      message: 'Tenant and admin created successfully',
      tenant_id: tenant.id,
      admin_user_id: tenant.users[0].id,
    });
  } catch (err) {
    console.error('❌ Error in registration:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};