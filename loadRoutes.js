// loadRoutes.js
const fs = require('fs');
const path = require('path');

const loadRoutes = (app, dir = path.join(__dirname, 'routes')) => {
  console.log('🔧 [LOAD_ROUTES] Starting route loading process...');
  
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);

    // Skip if not a .js file or if file is empty
    if (!file.endsWith('.js') || fs.statSync(fullPath).size === 0) {
      return;
    }

    try {
      const routeName = file.replace('.routes.js', '').replace('.js', '');
      console.log(`🔧 [LOAD_ROUTES] Processing route file: ${file} (routeName: ${routeName})`);
      
      const router = require(fullPath);

      // Special case handling for route paths
      const mountPath = {
        auth: '/auth',
        users: '/users',
        tenants: '/tenants',
        register: '/register',
        blends: '/blends',
        fibres: '/fibres',
        shades: '/api/shades',
        orders: '/orders',
        buyers: '/buyers',
        production: '/api/productions',
        settings: '/settings',
        userSettings: '/user-settings',
        dashboard: '/api/dashboard',
        purchaseOrders: '/api/purchase-orders',
        mailingLists: '/api/mailing-lists',
        emailTemplates: '/email-templates',
        potentialBuyers: '/potential-buyers',
        attendance: '/attendance',
        webhooks: '/api/webhooks',
        growth: '/api/growth',
        ai: '/api/ai',
      }[routeName] || `/${routeName}`;

      console.log(`🔧 [LOAD_ROUTES] Route ${routeName} will be mounted at: ${mountPath}`);

      // Only mount if router is a valid Express router
      if (router && typeof router === 'function') {
        console.log(`✅ [LOAD_ROUTES] Mounting route: ${mountPath} from ${file}`);
        app.use(mountPath, router);
        
        // Special logging for webhook routes
        if (routeName === 'webhooks') {
          console.log('🎯 [LOAD_ROUTES] Webhook routes successfully mounted at /api/webhooks');
          console.log('🎯 [LOAD_ROUTES] Available webhook endpoints:');
          console.log('   - POST /api/webhooks/resend');
          console.log('   - GET /api/webhooks/events');
          console.log('   - GET /api/webhooks/analytics');
          console.log('   - GET /api/webhooks/bounces');
          console.log('   - DELETE /api/webhooks/bounces/:email');
        }
        
        // Special logging for growth routes
        if (routeName === 'growth') {
          console.log('🚀 [LOAD_ROUTES] Growth Engine routes successfully mounted at /api/growth');
          console.log('🚀 [LOAD_ROUTES] Available growth endpoints:');
          console.log('   - GET /api/growth/persona');
          console.log('   - POST /api/growth/persona');
          console.log('   - GET /api/growth/campaigns');
          console.log('   - POST /api/growth/campaigns');
          console.log('   - PUT /api/growth/campaigns/:id/status');
          console.log('   - GET /api/growth/campaigns/:id/brands');
          console.log('   - PUT /api/growth/brands/:id/status');
        }
        
        // Special logging for AI routes
        if (routeName === 'ai') {
          console.log('🤖 [LOAD_ROUTES] AI Integration routes successfully mounted at /api/ai');
          console.log('🤖 [LOAD_ROUTES] Available AI endpoints:');
          console.log('   - GET /api/ai/insights');
          console.log('   - POST /api/ai/insights/generate');
          console.log('   - GET /api/ai/predictive-models');
          console.log('   - POST /api/ai/predictive-models/train');
          console.log('   - GET /api/ai/predictive-models/:modelId');
          console.log('   - POST /api/ai/predictions/generate');
          console.log('   - GET /api/ai/predictions/:modelId/history');
          console.log('   - GET /api/ai/recommendations');
          console.log('   - POST /api/ai/recommendations/:recommendationId/apply');
          console.log('   - POST /api/ai/recommendations/generate');
          console.log('   - GET /api/ai/real-time');
        }
      } else {
        console.warn(`⚠️ [LOAD_ROUTES] Warning: Invalid router in ${file} - skipping`);
      }
    } catch (error) {
      console.error(`❌ [LOAD_ROUTES] Error loading route ${file}:`, error.message);
      console.error(`❌ [LOAD_ROUTES] Error stack:`, error.stack);
    }
  });
  
  console.log('✅ [LOAD_ROUTES] Route loading process completed');
};
  
const webhooksRoutes = require('./routes/webhooks.routes');
  
module.exports = (app) => {
  loadRoutes(app);
  app.use('/api', webhooksRoutes);
};