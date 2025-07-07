const express = require('express');
const router = express.Router();
const growthController = require('../controllers/growth.controller');
const { verifyToken, flexibleAuthMiddleware, n8nAuthMiddleware } = require('../middlewares/auth.middleware');

// Destructure the new controller functions
const { getOutreachEmail, updateEmailAsSent } = growthController;

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
 * /growth/campaigns/{campaignId}:
 *   get:
 *     summary: Get growth campaign details
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
 *         description: Campaign details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.get('/campaigns/:campaignId', verifyToken, growthController.getCampaignDetails);

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

// --- SUPPLIER DISCOVERY ROUTES ---

/**
 * @swagger
 * /growth/brands/{brandId}/find-suppliers:
 *   post:
 *     summary: Find suppliers for a discovered brand
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
 *     responses:
 *       202:
 *         description: Supplier discovery process initiated
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Server error
 */
router.post('/brands/:brandId/find-suppliers', verifyToken, growthController.findSuppliersForBrand);

/**
 * @swagger
 * /growth/brands/{brandId}/suppliers:
 *   get:
 *     summary: Get discovered suppliers for a brand
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
 *     responses:
 *       200:
 *         description: Suppliers retrieved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Save discovered suppliers from n8n workflow (n8n only)
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
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
 *               - suppliers
 *             properties:
 *               suppliers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     companyName:
 *                       type: string
 *                       description: Supplier company name
 *                     country:
 *                       type: string
 *                       description: Supplier country
 *                     specialization:
 *                       type: string
 *                       description: Supplier specialization (e.g., "Knitwear", "Denim")
 *                     sourceUrl:
 *                       type: string
 *                       description: URL where supplier info was found
 *                     relevanceScore:
 *                       type: integer
 *                       description: Relevance score for prioritization
 *     responses:
 *       201:
 *         description: Suppliers saved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized (invalid API key)
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Server error
 */
router.get('/brands/:brandId/suppliers', verifyToken, growthController.getDiscoveredSuppliers);
router.post('/brands/:brandId/suppliers', n8nAuthMiddleware, growthController.saveDiscoveredSuppliers);

/**
 * @swagger
 * /growth/suppliers/{supplierId}/contacts:
 *   get:
 *     summary: Get target contacts for a supplier
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Save target contacts from n8n workflow (n8n only)
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contacts
 *             properties:
 *               contacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Contact full name
 *                     title:
 *                       type: string
 *                       description: Contact job title
 *                     email:
 *                       type: string
 *                       description: Contact email address
 *                     linkedinUrl:
 *                       type: string
 *                       description: LinkedIn profile URL
 *                     source:
 *                       type: string
 *                       description: Source of contact information
 *     responses:
 *       201:
 *         description: Contacts saved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized (invalid API key)
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Server error
 */
router.get('/suppliers/:supplierId/contacts', verifyToken, growthController.getTargetContacts);
router.post('/suppliers/:supplierId/contacts', n8nAuthMiddleware, growthController.saveTargetContacts);

// --- OUTREACH ROUTES ---

/**
 * @swagger
 * /growth/contacts/{contactId}/generate-draft:
 *   post:
 *     summary: Generate outreach email draft for a contact
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target Contact ID
 *     responses:
 *       202:
 *         description: Email draft generation initiated
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Server error
 */
router.post('/contacts/:contactId/generate-draft', verifyToken, growthController.generateOutreachDraft);

/**
 * @swagger
 * /growth/contacts/{contactId}/outreach-emails:
 *   get:
 *     summary: Get saved outreach email drafts for a contact
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target Contact ID
 *     responses:
 *       200:
 *         description: Outreach emails retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contactId:
 *                   type: string
 *                   description: Contact ID
 *                 contactName:
 *                   type: string
 *                   description: Contact name
 *                 supplierName:
 *                   type: string
 *                   description: Supplier company name
 *                 outreachEmails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Outreach email ID
 *                       subject:
 *                         type: string
 *                         description: Email subject
 *                       body:
 *                         type: string
 *                         description: Email body
 *                       status:
 *                         type: string
 *                         enum: [DRAFT, QUEUED, SENT, FAILED, REPLIED]
 *                         description: Email status
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Creation timestamp
 *       404:
 *         description: Contact not found or unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/contacts/:contactId/outreach-emails', verifyToken, growthController.getOutreachEmails);

/**
 * @swagger
 * /growth/outreach-emails:
 *   post:
 *     summary: Save generated outreach email draft from n8n workflow (n8n only)
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactId
 *               - subject
 *               - body
 *             properties:
 *               contactId:
 *                 type: string
 *                 description: Target Contact ID
 *               subject:
 *                 type: string
 *                 description: Email subject line
 *               body:
 *                 type: string
 *                 description: Email body content
 *               serviceMessageId:
 *                 type: string
 *                 description: Optional service message ID for tracking
 *               tenantId:
 *                 type: string
 *                 description: Tenant ID for validation
 *     responses:
 *       201:
 *         description: Email draft saved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized (invalid API key)
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Server error
 */
router.post('/outreach-emails', n8nAuthMiddleware, growthController.saveOutreachEmail);

/**
 * @swagger
 * /growth/outreach-emails/{emailId}:
 *   get:
 *     summary: Get a single outreach email draft for n8n sending workflow (n8n only)
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Outreach Email ID
 *     responses:
 *       200:
 *         description: Email draft retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Email ID
 *                 subject:
 *                   type: string
 *                   description: Email subject
 *                 body:
 *                   type: string
 *                   description: Email body
 *                 status:
 *                   type: string
 *                   description: Email status
 *                 targetContact:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       description: Recipient email address
 *                     name:
 *                       type: string
 *                       description: Recipient name
 *       400:
 *         description: Invalid emailId format
 *       401:
 *         description: Unauthorized (invalid API key)
 *       404:
 *         description: Email draft not found
 *       500:
 *         description: Server error
 */
router.get('/outreach-emails/:emailId', n8nAuthMiddleware, getOutreachEmail);

/**
 * @swagger
 * /growth/outreach-emails/{emailId}/sent:
 *   patch:
 *     summary: Update an email's status to SENT after n8n sends it (n8n only)
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Outreach Email ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceMessageId:
 *                 type: string
 *                 description: Service message ID from email provider (optional)
 *     responses:
 *       200:
 *         description: Email status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 emailId:
 *                   type: string
 *                   description: Email ID
 *                 status:
 *                   type: string
 *                   description: Updated status (SENT)
 *                 sentAt:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp when email was sent
 *                 serviceMessageId:
 *                   type: string
 *                   description: Service message ID
 *       400:
 *         description: Invalid emailId format
 *       401:
 *         description: Unauthorized (invalid API key)
 *       404:
 *         description: Email draft not found
 *       500:
 *         description: Server error
 */
router.patch('/outreach-emails/:emailId/sent', n8nAuthMiddleware, updateEmailAsSent);

/**
 * @swagger
 * /growth/email-events:
 *   post:
 *     summary: Process incoming email events from Resend via n8n webhook (n8n only)
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 description: Event type (e.g., 'email.replied', 'email.bounced')
 *                 example: 'email.replied'
 *               data:
 *                 type: object
 *                 properties:
 *                   email_id:
 *                     type: string
 *                     description: Service message ID from email provider
 *                     example: 'resend-message-id-123'
 *                   recipient:
 *                     type: string
 *                     description: Recipient email address
 *                   subject:
 *                     type: string
 *                     description: Email subject
 *     responses:
 *       200:
 *         description: Event processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 eventType:
 *                   type: string
 *                   description: Processed event type
 *                 processed:
 *                   type: boolean
 *                   description: Whether the event was processed
 *       400:
 *         description: Invalid event data
 *       401:
 *         description: Unauthorized (invalid API key)
 *       404:
 *         description: Original email not found
 *       500:
 *         description: Server error
 */
router.post('/email-events', n8nAuthMiddleware, growthController.processEmailEvent);

/**
 * @swagger
 * /growth/outreach-emails/{emailId}/send:
 *   post:
 *     summary: Trigger n8n EmailSender workflow to send an approved email draft
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Outreach Email ID to send
 *     responses:
 *       202:
 *         description: Email sending process initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 status:
 *                   type: string
 *                   description: Email status (queued)
 *                 emailId:
 *                   type: string
 *                   description: Email ID
 *                 subject:
 *                   type: string
 *                   description: Email subject
 *                 recipient:
 *                   type: string
 *                   description: Recipient email address
 *                 contactName:
 *                   type: string
 *                   description: Contact name
 *       400:
 *         description: Invalid request or email cannot be sent
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Email draft not found
 *       500:
 *         description: Server error
 *       503:
 *         description: Email service unavailable
 */
router.post('/outreach-emails/:emailId/send', verifyToken, growthController.triggerEmailSend);

/**
 * @swagger
 * /growth/contacts/find-by-email:
 *   get:
 *     summary: Find a contact by email address and automatically determine tenant context
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to search for
 *       - in: query
 *         name: tenantId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional tenant ID for filtering (if not provided, searches all tenants)
 *     responses:
 *       200:
 *         description: Contact found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 tenantId:
 *                   type: string
 *                   format: uuid
 *                   description: Tenant ID automatically determined from contact relationships
 *                 contact:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Contact ID
 *                     name:
 *                       type: string
 *                       description: Contact name
 *                     email:
 *                       type: string
 *                       description: Contact email
 *                     title:
 *                       type: string
 *                       description: Contact job title
 *                     linkedinUrl:
 *                       type: string
 *                       description: LinkedIn profile URL
 *                     supplier:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         companyName:
 *                           type: string
 *                         country:
 *                           type: string
 *                         specialization:
 *                           type: string
 *                     brand:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         companyName:
 *                           type: string
 *                         website:
 *                           type: string
 *                     campaign:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         keywords:
 *                           type: array
 *                           items:
 *                             type: string
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Not found message
 *                 email:
 *                   type: string
 *                   description: Email that was searched
 *                 tenantId:
 *                   type: string
 *                   description: Tenant ID
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Server error
 */
router.get('/contacts/find-by-email', n8nAuthMiddleware, growthController.findContactByEmail);

/**
 * @swagger
 * /growth/tasks/create-from-reply:
 *   post:
 *     summary: Create a follow-up task when a reply is detected by n8n
 *     tags: [Growth Engine]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderEmail
 *               - subject
 *               - tenantId
 *             properties:
 *               senderEmail:
 *                 type: string
 *                 format: email
 *                 description: Email address of the reply sender
 *               subject:
 *                 type: string
 *                 description: Subject line of the reply email
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 description: Tenant ID for the organization
 *               replyBody:
 *                 type: string
 *                 description: The text content of the customer's reply email
 *     responses:
 *       201:
 *         description: Follow-up task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 task:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Task ID
 *                     title:
 *                       type: string
 *                       description: Task title
 *                     priority:
 *                       type: string
 *                       enum: [LOW, MEDIUM, HIGH, URGENT]
 *                       description: Task priority
 *                     contactName:
 *                       type: string
 *                       description: Contact name
 *                     companyName:
 *                       type: string
 *                       description: Company name
 *                 emailUpdated:
 *                   type: boolean
 *                   description: Whether original email status was updated
 *                 originalEmailId:
 *                   type: string
 *                   description: ID of the original email that was replied to
 *       200:
 *         description: Reply from non-tracked contact, task not created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Information message
 *                 senderEmail:
 *                   type: string
 *                   description: Email address of the sender
 *                 action:
 *                   type: string
 *                   enum: [ignored]
 *                   description: Action taken
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Server error
 */
router.post('/tasks/create-from-reply', n8nAuthMiddleware, growthController.createTaskFromReply);

// =====================================================
// TASK MANAGEMENT CRUD ROUTES (Module 5)
// =====================================================

/**
 * @swagger
 * /growth/tasks:
 *   get:
 *     summary: Get all growth tasks with optional filtering
 *     tags: [Growth Engine - Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, DONE]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [HIGH, MEDIUM, LOW]
 *         description: Filter by task priority
 *       - in: query
 *         name: taskType
 *         schema:
 *           type: string
 *           enum: [REPLY_FOLLOWUP, GENERAL]
 *         description: Filter by task type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalCount:
 *                   type: integer
 *                 pendingCount:
 *                   type: integer
 *                 highPriorityCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new growth task
 *     tags: [Growth Engine - Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               priority:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *                 default: MEDIUM
 *               taskType:
 *                 type: string
 *                 enum: [REPLY_FOLLOWUP, GENERAL]
 *                 default: GENERAL
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Task due date
 *               contactId:
 *                 type: string
 *                 format: uuid
 *                 description: Related contact ID
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/tasks', verifyToken, growthController.getGrowthTasks);
router.post('/tasks', verifyToken, growthController.createGrowthTask);

/**
 * @swagger
 * /growth/tasks/{taskId}:
 *   get:
 *     summary: Get a specific growth task by ID
 *     tags: [Growth Engine - Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update an existing growth task
 *     tags: [Growth Engine - Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               priority:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, DONE]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Task due date
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a growth task
 *     tags: [Growth Engine - Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get('/tasks/:taskId', verifyToken, growthController.getGrowthTask);
router.put('/tasks/:taskId', verifyToken, growthController.updateGrowthTask);
router.delete('/tasks/:taskId', verifyToken, growthController.deleteGrowthTask);

/**
 * @swagger
 * /growth/tasks/{taskId}/generate-reply:
 *   post:
 *     summary: Generate an AI-powered reply draft for a specific task
 *     tags: [Growth Engine - Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID to generate reply for
 *     responses:
 *       200:
 *         description: AI reply draft generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 taskId:
 *                   type: string
 *                   description: Task ID
 *                 aiReplyDraft:
 *                   type: string
 *                   description: AI-generated reply draft
 *                 context:
 *                   type: object
 *                   properties:
 *                     contactName:
 *                       type: string
 *                       description: Contact name
 *                     companyName:
 *                       type: string
 *                       description: Company name
 *                     originalSubject:
 *                       type: string
 *                       description: Original email subject
 *       400:
 *         description: Invalid task type (not a reply follow-up task)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       408:
 *         description: Request timeout - AI generation took too long
 *       500:
 *         description: AI generation failed or configuration error
 */
// AI Reply Generation Route
router.post('/tasks/:taskId/generate-reply', verifyToken, growthController.generateAIReply);

/**
 * @swagger
 * /growth/tasks/{taskId}/ai-draft:
 *   get:
 *     summary: Get AI-generated draft content for a task
 *     tags: [Growth Engine - Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID to get AI draft for
 *     responses:
 *       200:
 *         description: AI draft content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 draftId:
 *                   type: string
 *                   description: AI draft ID
 *                 subject:
 *                   type: string
 *                   description: AI-generated subject line
 *                 body:
 *                   type: string
 *                   description: AI-generated email body
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: When the draft was created
 *                 contact:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     companyName:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found or no AI draft available
 *       500:
 *         description: Server error
 */
router.get('/tasks/:taskId/ai-draft', verifyToken, growthController.getAIDraft);

/**
 * @swagger
 * /growth/tasks/{taskId}/send-reply:
 *   post:
 *     summary: Send AI-generated reply through existing EmailSender workflow
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID with AI-generated reply draft to send
 *     responses:
 *       200:
 *         description: AI reply sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "AI reply sent successfully"
 *                 status:
 *                   type: string
 *                   example: "sent"
 *                 emailId:
 *                   type: string
 *                   format: uuid
 *                   description: Email ID that was sent
 *                 subject:
 *                   type: string
 *                   description: Email subject
 *                 recipient:
 *                   type: string
 *                   description: Recipient email address
 *                 contactName:
 *                   type: string
 *                   description: Recipient name
 *                 taskId:
 *                   type: string
 *                   format: uuid
 *                   description: Task ID that was completed
 *       400:
 *         description: Bad request - No AI draft found or email already sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot access this draft
 *       404:
 *         description: Task not found or AI draft not found
 *       500:
 *         description: Server error - Email service not configured or sending failed
 */
router.post('/tasks/:taskId/send-reply', verifyToken, growthController.sendAIReply);

/**
 * @swagger
 * /growth/ai-reply-callback:
 *   post:
 *     summary: Callback endpoint for n8n to deliver completed AI reply drafts
 *     tags: [Growth Engine]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - aiReply
 *             properties:
 *               taskId:
 *                 type: string
 *                 format: uuid
 *                 description: Follow-up task ID that requested the AI reply
 *               contactId:
 *                 type: string
 *                 format: uuid
 *                 description: Target contact ID for the reply (optional - can be derived from task)
 *               aiReply:
 *                 type: string
 *                 description: AI-generated reply body
 *               subject:
 *                 type: string
 *                 description: AI-generated subject line (optional)
 *               originalSubject:
 *                 type: string
 *                 description: Original email subject for reference (optional)
 *               contactName:
 *                 type: string
 *                 description: Contact name for reference (optional)
 *               companyName:
 *                 type: string
 *                 description: Company name for reference (optional)
 *     responses:
 *       201:
 *         description: AI reply draft saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskId:
 *                       type: string
 *                     draftId:
 *                       type: string
 *                     contactId:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Missing required fields or cannot determine contact ID
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
// AI Reply Callback Route (called by n8n, no auth required)
router.post('/ai-reply-callback', growthController.handleAIReplyCallback);

/**
 * @swagger
 * /growth/outreach-emails/{emailId}/resend:
 *   post:
 *     summary: Create a new draft copy of an existing email for resending
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Original Email ID to copy for resending
 *     responses:
 *       201:
 *         description: Draft copy created successfully for resending
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 originalEmailId:
 *                   type: string
 *                   description: Original email ID
 *                 newDraftId:
 *                   type: string
 *                   description: New draft copy ID
 *                 subject:
 *                   type: string
 *                   description: New draft subject (with "Resend" suffix)
 *                 contactName:
 *                   type: string
 *                   description: Contact name
 *                 contactEmail:
 *                   type: string
 *                   description: Contact email
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Original email not found
 *       500:
 *         description: Server error
 */
router.post('/outreach-emails/:emailId/resend', verifyToken, growthController.resendEmail);

/**
 * @swagger
 * /growth/outreach-emails/{emailId}/engagement-stats:
 *   get:
 *     summary: Get engagement statistics for a specific outreach email
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Outreach Email ID to get engagement stats for
 *     responses:
 *       200:
 *         description: Engagement statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emailId:
 *                   type: string
 *                   description: Email ID
 *                 subject:
 *                   type: string
 *                   description: Email subject
 *                 status:
 *                   type: string
 *                   description: Email status
 *                 sentAt:
 *                   type: string
 *                   format: date-time
 *                   description: When email was sent
 *                 targetContact:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     company:
 *                       type: string
 *                 engagement:
 *                   type: object
 *                   properties:
 *                     totalEvents:
 *                       type: integer
 *                       description: Total number of engagement events
 *                     openCount:
 *                       type: integer
 *                       description: Number of times email was opened
 *                     clickCount:
 *                       type: integer
 *                       description: Number of times links were clicked
 *                     firstOpened:
 *                       type: string
 *                       format: date-time
 *                       description: When email was first opened
 *                     firstClicked:
 *                       type: string
 *                       format: date-time
 *                       description: When first link was clicked
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *                       description: Most recent engagement activity
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [OPENED, CLICKED]
 *                       ipAddress:
 *                         type: string
 *                       userAgent:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid request or email ID format
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Email not found
 *       500:
 *         description: Server error
 */
router.get('/outreach-emails/:emailId/engagement-stats', verifyToken, growthController.getEmailEngagementStats);

/**
 * @swagger
 * /growth/contacts/{contactId}/suppression-status:
 *   get:
 *     summary: Check if a contact is suppressed (DO_NOT_CONTACT)
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Target Contact ID to check suppression status for
 *     responses:
 *       200:
 *         description: Contact suppression status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contactId:
 *                   type: string
 *                   description: Contact ID
 *                 name:
 *                   type: string
 *                   description: Contact name
 *                 email:
 *                   type: string
 *                   description: Contact email
 *                 company:
 *                   type: string
 *                   description: Company name
 *                 status:
 *                   type: string
 *                   enum: [ACTIVE, DO_NOT_CONTACT]
 *                   description: Contact status
 *                 isSuppressed:
 *                   type: boolean
 *                   description: Whether the contact is suppressed
 *                 canSendEmail:
 *                   type: boolean
 *                   description: Whether emails can be sent to this contact
 *       400:
 *         description: Invalid request or contact ID format
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Server error
 */
router.get('/contacts/:contactId/suppression-status', verifyToken, growthController.checkContactSuppression);

/**
 * @swagger
 * /growth/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive analytics dashboard data
 *     tags: [Growth Engine - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Timeframe for recent activity analysis
 *     responses:
 *       200:
 *         description: Analytics dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenantId:
 *                   type: string
 *                 timeframe:
 *                   type: string
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalCampaigns:
 *                       type: integer
 *                     totalBrands:
 *                       type: integer
 *                     totalSuppliers:
 *                       type: integer
 *                     totalContacts:
 *                       type: integer
 *                     totalEmails:
 *                       type: integer
 *                     totalEvents:
 *                       type: integer
 *                     activeContacts:
 *                       type: integer
 *                     suppressedContacts:
 *                       type: integer
 *                     pendingTasks:
 *                       type: integer
 *                 performance:
 *                   type: object
 *                   properties:
 *                     emailsSent:
 *                       type: integer
 *                     emailsReplied:
 *                       type: integer
 *                     openRate:
 *                       type: string
 *                     clickRate:
 *                       type: string
 *                     replyRate:
 *                       type: string
 *                     bounceRate:
 *                       type: string
 *                 recentActivity:
 *                   type: object
 *                 topCampaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                 breakdowns:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/analytics/dashboard', verifyToken, growthController.getAnalyticsDashboard);

/**
 * @swagger
 * /growth/analytics/campaigns:
 *   get:
 *     summary: Get detailed campaign performance analytics
 *     tags: [Growth Engine - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenantId:
 *                   type: string
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalCampaigns:
 *                       type: integer
 *                     overallOpenRate:
 *                       type: string
 *                     overallClickRate:
 *                       type: string
 *                     overallReplyRate:
 *                       type: string
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       campaignId:
 *                         type: string
 *                       campaignName:
 *                         type: string
 *                       metrics:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/analytics/campaigns', verifyToken, growthController.getCampaignAnalytics);

/**
 * @swagger
 * /growth/analytics/growth-metrics:
 *   get:
 *     summary: Get growth metrics and time-series data
 *     tags: [Growth Engine - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Timeframe for growth analysis
 *     responses:
 *       200:
 *         description: Growth metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenantId:
 *                   type: string
 *                 timeframe:
 *                   type: string
 *                 startDate:
 *                   type: string
 *                   format: date-time
 *                 endDate:
 *                   type: string
 *                   format: date-time
 *                 timeSeries:
 *                   type: object
 *                   properties:
 *                     campaigns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     contacts:
 *                       type: array
 *                     emails:
 *                       type: array
 *                     emailsSent:
 *                       type: array
 *                 summary:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/analytics/growth-metrics', verifyToken, growthController.getGrowthMetrics);

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

/**
 * @swagger
 * /growth/tasks/{taskId}/send-reply:
 *   post:
 *     summary: Send AI-generated reply through existing EmailSender workflow
 *     tags: [Growth Engine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID with AI-generated reply draft to send
 *     responses:
 *       200:
 *         description: AI reply sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "AI reply sent successfully"
 *                 status:
 *                   type: string
 *                   example: "sent"
 *                 emailId:
 *                   type: string
 *                   format: uuid
 *                   description: Email ID that was sent
 *                 subject:
 *                   type: string
 *                   description: Email subject
 *                 recipient:
 *                   type: string
 *                   description: Recipient email address
 *                 contactName:
 *                   type: string
 *                   description: Recipient name
 *                 taskId:
 *                   type: string
 *                   format: uuid
 *                   description: Task ID that was completed
 *       400:
 *         description: Bad request - No AI draft found or email already sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot access this draft
 *       404:
 *         description: Task not found or AI draft not found
 *       500:
 *         description: Server error - Email service not configured or sending failed
 */
router.post('/tasks/:taskId/send-reply', verifyToken, growthController.sendAIReply);

module.exports = router; 