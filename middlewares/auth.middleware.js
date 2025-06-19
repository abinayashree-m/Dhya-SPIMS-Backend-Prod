const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
  // 🔍 Debug: Log incoming auth header (redact token length)
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('\n[AuthMiddleware] Incoming Authorization:', req.headers.authorization ? `Bearer ...${req.headers.authorization.slice(-6)}` : 'NONE');
  }

  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ error: 'Bearer token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[AuthMiddleware] Decoded Token:', decoded);
    }

    // 🔁 Normalize keys for internal use
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      tenantId: decoded.tenant_id, // ✅ now camelCase
    };

    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[AuthMiddleware] Req.user set:', req.user);
    }

    next();
  } catch (err) {
    console.error('[AuthMiddleware] Token verification failed:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };