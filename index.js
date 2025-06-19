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
const app = express();
const prisma = new PrismaClient();

// ✅ Middlewares
app.use(helmet());
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
app.use(morgan('dev'));

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('SPIMS API is running ✅');
});

// Load routes automatically
loadRoutes(app);

// ✅ Swagger Docs (served at /docs via setupSwagger)
setupSwagger(app);

// Error handling
app.use(errorMiddleware);

// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`SPIMS SWAGGER API running at: http://localhost:5001/docs/`);

});