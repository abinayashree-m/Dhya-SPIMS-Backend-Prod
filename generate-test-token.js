require('dotenv').config();
const jwt = require('jsonwebtoken');

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log('🔑 JWT_SECRET:', JWT_SECRET);

// Create a test token for the admin user
const payload = {
  id: '23bdb038-b8f6-445d-9fd6-0c4c53cb0a52',
  email: 'admin@nscspinning.com',
  role: 'admin',
  tenant_id: '3bf9bed5-d468-47c5-9c19-61a7e37faedc'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('\n🔑 Generated Test JWT Token:');
console.log(token);
console.log('\n📋 Use this token in your API requests:');
console.log(`Authorization: Bearer ${token}`); 