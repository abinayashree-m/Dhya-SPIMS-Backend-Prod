/**
 * Middleware to restrict access based on user roles
 * @param {...string} roles Allowed roles (e.g. 'admin', 'supervisor')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
      }
      next();
    };
  };
  
  module.exports = { requireRole };