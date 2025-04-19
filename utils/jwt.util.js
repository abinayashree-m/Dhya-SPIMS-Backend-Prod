const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { generateToken };