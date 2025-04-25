const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SPIMS API Docs',
      version: '1.0.0',
      description: 'Spinning Mills Intelligent Management System API documentation',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:5001',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Settings: {
          type: 'object',
          properties: {
            theme: { type: 'string', example: 'auto' },
            locale: { type: 'string', example: 'en' },
            email_notifications: { type: 'boolean', example: true },
            sms_alerts: { type: 'boolean', example: false },
            production_reminders: { type: 'boolean', example: true },
            plan_type: { type: 'string', example: 'premium' },
            billing_start_date: { type: 'string', format: 'date-time' },
            billing_end_date: { type: 'string', format: 'date-time' },
            integration_ai: { type: 'boolean', example: true },
            integration_tally: { type: 'boolean', example: false },
            feature_toggles: {
              type: 'object',
              additionalProperties: true,
              example: { fiberStockChart: true, advancedReports: false },
            },
          },
        },
        UserSettings: {
          type: 'object',
          properties: {
            theme: { type: 'string', example: 'light' },
            locale: { type: 'string', example: 'en' },
            email_notifications: { type: 'boolean', example: true },
            sms_alerts: { type: 'boolean', example: false },
            feature_toggles: {
              type: 'object',
              additionalProperties: true,
              example: { showDashboardTips: true, compactMode: false },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;