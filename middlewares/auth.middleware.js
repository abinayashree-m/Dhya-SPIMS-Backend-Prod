const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ error: 'Bearer token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach decoded { id, role, etc. } to req.user
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };