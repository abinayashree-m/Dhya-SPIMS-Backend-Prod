const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const helmet = require('helmet');
const morgan = require('morgan');
const loadRoutes = require('./loadRoutes');
const errorMiddleware = require('./middlewares/error.middleware');
const setupSwagger = require('./swagger');

dotenv.config();

console.log('🚀 [SERVER] === SPIMS SERVER STARTING ===');
console.log('🚀 [SERVER] Loading environment variables...');
console.log('🚀 [SERVER] Environment check:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5001,
  hasJWT_SECRET: !!process.env.JWT_SECRET,
  hasN8N_API_KEY: !!process.env.N8N_API_KEY,
  hasN8N_PERSONA_BUILDER_WEBHOOK_URL: !!process.env.N8N_PERSONA_BUILDER_WEBHOOK_URL,
  hasDATABASE_URL: !!process.env.DATABASE_URL
});

const app = express();
const prisma = new PrismaClient();

// ✅ Middlewares
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:5173', 
      'http://localhost:5174',
      'https://dhya-spims-frontend-prod.vercel.app',
      'https://www.covai.ai',
      'https://covai.ai/',
      'https://www.dhya.app'
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.options('*', cors()); // handle preflight requests
app.use(morgan('dev'));

// ✅ Health Check
app.get('/', (req, res) => {
  console.log('💓 [SERVER] Health check requested');
  res.send('SPIMS API is running ✅');
});

console.log('🚀 [SERVER] Express app configured, loading routes...');

// Load routes automatically
loadRoutes(app);

console.log('🚀 [SERVER] All routes loaded successfully');

// ✅ Swagger Docs (served at /docs via setupSwagger)
setupSwagger(app);

// Error handling
app.use(errorMiddleware);

// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('✅ [SERVER] === SPIMS SERVER STARTED SUCCESSFULLY ===');
  console.log(`✅ [SERVER] Server is running on port ${PORT}`);
  console.log(`✅ [SERVER] SPIMS SWAGGER API running at: http://localhost:${PORT}/docs/`);
  console.log(`✅ [SERVER] Health check available at: http://localhost:${PORT}/health`);
  console.log('✅ [SERVER] === READY TO ACCEPT REQUESTS ===');
});