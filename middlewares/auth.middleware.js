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

/**
 * This middleware checks for a secret API key in the 'x-api-key' header.
 * It's used to protect endpoints that should only be accessible by our n8n workflows.
 */
const n8nAuthMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // 1. Check if the header exists
  if (!apiKey) {
    return res.status(401).json({ message: 'Unauthorized: API key is missing.' });
  }

  // 2. Check if the key matches the one stored in your environment variables
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid API key.' });
  }

  // 3. If the key is valid, proceed to the next function (the controller)
  next();
};

/**
 * Combined middleware that accepts either JWT token or n8n API key
 * This allows the same endpoint to be used by both frontend users and n8n workflows
 */
const flexibleAuthMiddleware = (req, res, next) => {
  // First, try JWT authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyToken(req, res, next);
  }

  // If no JWT, try n8n API key authentication
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return n8nAuthMiddleware(req, res, next);
  }

  // If neither authentication method is provided
  return res.status(401).json({ 
    error: 'Authentication required. Provide either Bearer token or x-api-key header.' 
  });
};

module.exports = { 
  verifyToken, 
  n8nAuthMiddleware, 
  flexibleAuthMiddleware 
};