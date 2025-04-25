// loadRoutes.js
const fs = require('fs');
const path = require('path');

const loadRoutes = (app, dir = path.join(__dirname, 'routes')) => {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);

    // Only handle `.js` route files
    if (fs.statSync(fullPath).isFile() && file.endsWith('.js')) {
      const routePath = '/' + file.replace('.routes.js', '').replace('.js', '');
      const router = require(fullPath);

      // Special case handling
      const mountPath = {
        auth: '/auth',
        users: '/users',
        tenants: '/tenants',
        register: '/register',
        blends: '/blends',
        fibres: '/fibres',
        shades: '/shades',
        orders: '/orders',
        buyers: '/buyers',
        productions: '/productions',
        settings: '/settings',
        userSettings: '/user-settings',
      }[file.replace('.routes.js', '')] || routePath;

      app.use(mountPath, router);
      console.log(`🔗 Route loaded: ${mountPath}`);
    }
  });
};

module.exports = loadRoutes;