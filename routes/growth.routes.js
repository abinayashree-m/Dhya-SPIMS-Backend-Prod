const express = require('express');
const router = express.Router();
const growthController = require('../controllers/growth.controller');
const { verifyToken, flexibleAuthMiddleware } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Growth Engine
 *   description: Texintelli Growth Engine API endpoints
 */

// Logging middleware for growth routes
router.use((req, res, next) => {
  console.log(`🌐 [GROWTH_ROUTES] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  console.log(`🌐 [GROWTH_ROUTES] Request details:`, {
    method: req.method,
    path: req.path,
    query: req.query,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer [HIDDEN]' : 'None',
      'x-api-key': req.headers['x-api-key'] ? 'API_KEY [HIDDEN]' : 'None'
    }
  });
  next();
});

/**
 * @swagger
 * /growth/persona:
 *   get:
 *     summary: Get company persona for current tenant
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company persona retrieved successfully
 *       404:
 *         description: Company persona not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/persona', verifyToken, growthController.getCompanyPersona);

/**
 * @swagger
 * /growth/persona:
 *   post:
 *     summary: Create or update company persona (supports both JWT and n8n API key auth)
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - persona
 *             properties:
 *               persona:
 *                 type: string
 *                 description: AI-generated company persona in Markdown format
 *               personaContent:
 *                 type: string
 *                 description: Alternative field name for persona content (for n8n compatibility)
 *               tenantId:
 *                 type: string
 *                 description: Tenant ID (required when using API key authentication)
 *     responses:
 *       201:
 *         description: Company persona created/updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/persona', flexibleAuthMiddleware, growthController.upsertCompanyPersona);

/**
 * @swagger
 * /growth/persona/generate:
 *   post:
 *     summary: Trigger AI-powered persona generation (frontend proxy endpoint)
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personaData
 *             properties:
 *               personaData:
 *                 type: string
 *                 description: User input for persona generation
 *     responses:
 *       202:
 *         description: Persona generation process initiated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *       503:
 *         description: Automation service unavailable
 *       408:
 *         description: Request timeout
 */
router.post('/persona/generate', verifyToken, growthController.triggerPersonaGeneration);

/**
 * @swagger
 * /growth/campaigns:
 *   get:
 *     summary: Get all growth campaigns for current tenant
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Growth campaigns retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/campaigns', verifyToken, growthController.getGrowthCampaigns);

/**
 * @swagger
 * /growth/campaigns:
 *   post:
 *     summary: Create a new growth campaign
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - keywords
 *             properties:
 *               name:
 *                 type: string
 *                 description: Campaign name
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Search keywords for brand discovery
 *               region:
 *                 type: string
 *                 description: Target region (optional)
 *     responses:
 *       201:
 *         description: Growth campaign created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/campaigns', verifyToken, growthController.createGrowthCampaign);

/**
 * @swagger
 * /growth/campaigns/{campaignId}/status:
 *   put:
 *     summary: Update growth campaign status
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ANALYZING, READY_FOR_OUTREACH, ACTIVE, PAUSED, COMPLETED]
 *     responses:
 *       200:
 *         description: Campaign status updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.put('/campaigns/:campaignId/status', verifyToken, growthController.updateCampaignStatus);

/**
 * @swagger
 * /growth/campaigns/{campaignId}/brands:
 *   get:
 *     summary: Get discovered brands for a campaign
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Discovered brands retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.get('/campaigns/:campaignId/brands', verifyToken, growthController.getDiscoveredBrands);

/**
 * @swagger
 * /growth/brands/{brandId}/status:
 *   put:
 *     summary: Update brand status
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DISCOVERED, SUPPLIERS_IDENTIFIED, CONTACTS_ENRICHED, CONTACTED, RESPONDED, QUALIFIED, CONVERTED]
 *     responses:
 *       200:
 *         description: Brand status updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Server error
 */
router.put('/brands/:brandId/status', verifyToken, growthController.updateBrandStatus);

module.exports = router; 