const express = require('express');
const router = express.Router();
const growthController = require('../controllers/growth.controller');
const { verifyToken, flexibleAuthMiddleware, n8nAuthMiddleware } = require('../middlewares/auth.middleware');

// Add console logs to track route access
console.log('🚀 [GROWTH ROUTES] Growth routes file loaded');
console.log('🚀 [GROWTH ROUTES] Controller methods available:', Object.keys(growthController));

/**
 * @swagger
 * tags:
 *   name: Growth Engine
 *   description: Texintelli Growth Engine API endpoints
 */

// Add middleware to log all requests to growth endpoints
router.use((req, res, next) => {
  console.log(`🚀 [GROWTH ROUTES] === ${req.method} ${req.originalUrl} ===`);
  console.log(`🚀 [GROWTH ROUTES] Request headers:`, {
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? `Bearer ...${req.headers.authorization.slice(-6)}` : 'None'
  });
  console.log(`🚀 [GROWTH ROUTES] Request body:`, {
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    bodySize: req.body ? JSON.stringify(req.body).length : 0
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

/**
 * @swagger
 * /growth/campaigns/{campaignId}/brands:
 *   post:
 *     summary: Save discovered brands from n8n workflow (n8n only)
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
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
 *               - brands
 *             properties:
 *               brands:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     brandName:
 *                       type: string
 *                       description: Company name
 *                     website:
 *                       type: string
 *                       description: Company website
 *                     productFitAnalysis:
 *                       type: string
 *                       description: AI analysis of product fit
 *     responses:
 *       201:
 *         description: Brands saved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized (invalid API key)
 *       500:
 *         description: Server error
 */
router.post('/campaigns/:campaignId/brands', n8nAuthMiddleware, growthController.saveDiscoveredBrands);

// --- INTERNAL SERVICE ROUTES (for n8n workflows) ---

/**
 * @swagger
 * /growth/internal/persona/{tenantId}:
 *   get:
 *     summary: Get company persona for a specific tenant (Internal Service)
 *     description: Fetches company persona for a specific tenant. Used by internal services like n8n workflows.
 *     tags: [Growth Engine - Internal]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID (UUID format)
 *         example: "3bf9bed5-d468-47c5-9c19-61a7e37faedc"
 *     responses:
 *       200:
 *         description: Company persona retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 tenantId:
 *                   type: string
 *                 executiveSummary:
 *                   type: string
 *                 targetMarketSweetSpot:
 *                   type: string
 *                 swotAnalysis:
 *                   type: object
 *                 detailedAnalysis:
 *                   type: object
 *       400:
 *         description: Invalid tenant ID format
 *       401:
 *         description: Unauthorized - Invalid API key
 *       404:
 *         description: Company persona not found for this tenant
 *       500:
 *         description: Server error
 */
router.get('/internal/persona/:tenantId', n8nAuthMiddleware, growthController.getPersonaForService);

module.exports = router; 