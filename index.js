const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();
const app = express();
const prisma = new PrismaClient();

// ✅ Middlewares
app.use(
  cors({
    origin: [
      'http://localhost:5173', 
      'https://dhya-spims-frontend-prod.vercel.app',
      'https://www.dhya.app'
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.options('*', cors()); // handle preflight requests
// ✅ Swagger Docs
const setupSwagger = require('./swagger');
setupSwagger(app);

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('SPIMS API is running ✅');
});

// ✅ Route Imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const tenantRoutes = require('./routes/tenants.routes');
const registerRoutes = require('./routes/register.routes');

const blendRoutes = require('./routes/blends.routes');
const blendFibreRoutes = require('./routes/blendFibres.routes');
const fibreRoutes = require('./routes/fibres.routes');
const shadeRoutes = require('./routes/shades.routes');

const orderRoutes = require('./routes/orders.routes');
const buyerRoutes = require('./routes/buyers.routes');
const productionRoutes = require('./routes/production.routes');

const settingsRoutes = require('./routes/settings.routes');
const userSettingsRoutes = require('./routes/userSettings.routes');
const roleRoutes = require('./routes/userRoles.routes');
const mailingListRoutes = require('./routes/mailingLists.routes.js');


// 🔒 Optional Routes (Uncomment when available)
// const subscriptionRoutes = require('./routes/subscriptions.routes');
// const brandRoutes = require('./routes/brands.routes');
// const yarnTypeRoutes = require('./routes/yarnTypes.routes');
// const yarnRoutes = require('./routes/yarns.routes');
// const fileRoutes = require('./routes/files.routes');
// const machineRoutes = require('./routes/machines.routes');
const supplierRoutes = require('./routes/suppliers.routes');
const fibreTransferRoutes = require('./routes/fibreTransfers.routes');
const employeeRoutes = require('./routes/employees.routes');
const emailTemplates = require('./routes/emailTemplates.routes');
const marketingRoutes = require('./routes/marketing.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const potentialBuyersRoutes = require('./routes/potentialBuyers.routes');
const parseRoutes = require('./routes/parse.routes');

// ✅ Route Registration
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/tenants', tenantRoutes);
app.use('/register', registerRoutes);
// app.use('/subscriptions', subscriptionRoutes);

app.use('/blends', blendRoutes);
app.use('/blend-fibres', blendFibreRoutes);
app.use('/fibres', fibreRoutes);
app.use('/shades', shadeRoutes);

app.use('/orders', orderRoutes);
app.use('/buyers', buyerRoutes);
app.use('/productions', productionRoutes);

app.use('/settings', settingsRoutes);         // ✅ Tenant-level settings
app.use('/user-settings', userSettingsRoutes); // ✅ User-specific settings
app.use('/roles', roleRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/fibreTransfers', fibreTransferRoutes);
app.use('/employees', employeeRoutes);
app.use('/api/mailing-lists', mailingListRoutes);
app.use('/email-templates', emailTemplates);
app.use('/marketing', marketingRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/potential-buyers', potentialBuyersRoutes);
app.use('/purchase-orders', require('./routes/purchaseOrders.routes'));
app.use('/parse-purchase-order', parseRoutes);
// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 SPIMS API server running at: http://localhost:${PORT}`);
});