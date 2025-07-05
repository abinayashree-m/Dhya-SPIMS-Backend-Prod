const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

/**
 * Get the Company Persona for the current tenant
 */
exports.getCompanyPersona = async (req, res) => {
  console.log('🔍 [GROWTH] === GET COMPANY PERSONA REQUEST ===');
  console.log(`🔍 [GROWTH] Request headers:`, {
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer [HIDDEN]' : 'None'
  });
  
  try {
    const tenantId = req.user?.tenantId;
    console.log(`🔍 [GROWTH] User object:`, {
      hasUser: !!req.user,
      tenantId: tenantId,
      userId: req.user?.id || 'None'
    });
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    console.log(`🔍 [GROWTH] Fetching company persona for tenant: ${tenantId}`);

    const persona = await prisma.companyPersona.findUnique({
      where: { tenantId: tenantId },
    });

    if (!persona) {
      console.log(`📝 [GROWTH] No persona found for tenant: ${tenantId}`);
      console.log('📝 [GROWTH] Returning 404 response');
      return res.status(404).json({ 
        message: 'Company Persona not found for this tenant.',
        code: 'PERSONA_NOT_FOUND'
      });
    }

    console.log(`✅ [GROWTH] Persona found for tenant: ${tenantId}`);
    console.log(`✅ [GROWTH] Persona details:`, {
      id: persona.id,
      isActive: persona.isActive,
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt,
      executiveSummaryLength: persona.executiveSummary?.length || 0,
      targetMarketSweetSpotLength: persona.targetMarketSweetSpot?.length || 0,
      hasSwotAnalysis: !!persona.swotAnalysis,
      hasDetailedAnalysis: !!persona.detailedAnalysis,
      swotAnalysisKeys: persona.swotAnalysis ? Object.keys(persona.swotAnalysis) : [],
      detailedAnalysisKeys: persona.detailedAnalysis ? Object.keys(persona.detailedAnalysis) : []
    });
    console.log('✅ [GROWTH] === GET COMPANY PERSONA SUCCESS ===');
    res.status(200).json(persona);
  } catch (error) {
    console.error('❌ [GROWTH] === GET COMPANY PERSONA ERROR ===');
    console.error('❌ [GROWTH] Error fetching company persona:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch company persona',
      details: error.message 
    });
  }
};

/**
 * NEW: Proxy controller to trigger n8n workflow securely
 * Receives requests from frontend, then makes server-to-server call to n8n
 */
exports.triggerPersonaGeneration = async (req, res) => {
  console.log('🚀 [GROWTH] === TRIGGER PERSONA GENERATION REQUEST ===');
  console.log(`🚀 [GROWTH] Request body:`, {
    hasPersonaData: !!req.body.personaData,
    personaDataLength: req.body.personaData?.length || 0,
    personaDataPreview: req.body.personaData?.substring(0, 100) + '...' || 'None'
  });
  console.log(`🚀 [GROWTH] Request headers:`, {
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer [HIDDEN]' : 'None'
  });
  
  try {
    // 1. Get tenantId securely from the authenticated user's token
    const tenantId = req.user?.tenantId;
    console.log(`🚀 [GROWTH] User authentication:`, {
      hasUser: !!req.user,
      tenantId: tenantId,
      tenantIdType: typeof tenantId,
      userId: req.user?.id || 'None'
    });
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    // === ADD UUID VALIDATION ===
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(tenantId);
    
    console.log(`🚀 [GROWTH] Tenant ID validation:`, {
      tenantId: tenantId,
      isValidUuid: isValidUuid,
      length: tenantId?.length,
      type: typeof tenantId
    });

    if (!isValidUuid) {
      console.error('❌ [GROWTH] Invalid UUID format for tenantId from token:', tenantId);
      return res.status(400).json({ 
        error: 'Invalid authentication token: tenantId is not a valid UUID format.',
        details: `Expected UUID format like: 123e4567-e89b-12d3-a456-426614174000, got: ${tenantId}`
      });
    }
    // === END UUID VALIDATION ===

    const { personaData } = req.body;
    console.log(`🚀 [GROWTH] Validating persona data:`, {
      hasPersonaData: !!personaData,
      isString: typeof personaData === 'string',
      length: personaData?.length || 0
    });
    
    if (!personaData || typeof personaData !== 'string') {
      console.log('❌ [GROWTH] Invalid persona data:', { personaData, type: typeof personaData });
      return res.status(400).json({ 
        error: 'Persona data is required and must be a string' 
      });
    }

    console.log(`🚀 [GROWTH] Triggering persona generation for tenant: ${tenantId}`);

    // 2. Get the secret n8n webhook URL from environment variables
    const n8nWebhookUrl = process.env.N8N_PERSONA_BUILDER_WEBHOOK_URL;
    console.log(`🚀 [GROWTH] Environment check:`, {
      hasWebhookUrl: !!n8nWebhookUrl,
      webhookUrlPreview: n8nWebhookUrl ? n8nWebhookUrl.substring(0, 50) + '...' : 'None'
    });
    
    if (!n8nWebhookUrl) {
      console.error('❌ [GROWTH] N8N_PERSONA_BUILDER_WEBHOOK_URL is not set');
      return res.status(500).json({ 
        message: 'Automation service is not configured. Please contact support.' 
      });
    }

    // 3. Make the secure server-to-server call to n8n
    console.log(`📡 [GROWTH] Preparing n8n webhook call:`, {
      url: n8nWebhookUrl,
      payload: {
        hasPersonaData: !!personaData,
        personaDataLength: personaData.length,
        tenantId: tenantId,
        tenantIdValid: isValidUuid
      }
    });
    
    const n8nResponse = await axios.post(n8nWebhookUrl, {
      personaData: personaData,
      tenantId: tenantId, // Pass the secure tenantId to the workflow
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Texintelli-SPIMS/1.0'
      }
    });

    console.log(`✅ [GROWTH] n8n webhook called successfully:`, {
      status: n8nResponse.status,
      statusText: n8nResponse.statusText,
      responseData: n8nResponse.data
    });

    // 4. Respond to the frontend immediately to let it know the process has started
    const responseData = {
      message: 'Persona generation process has been successfully initiated.',
      status: 'processing',
      tenantId: tenantId
    };
    
    console.log('✅ [GROWTH] Sending success response to frontend:', responseData);
    console.log('✅ [GROWTH] === TRIGGER PERSONA GENERATION SUCCESS ===');
    res.status(202).json(responseData);

  } catch (error) {
    console.error('❌ [GROWTH] === TRIGGER PERSONA GENERATION ERROR ===');
    console.error('❌ [GROWTH] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    console.error('❌ [GROWTH] Error stack:', error.stack);
    
    // Provide specific error messages based on the type of error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('❌ [GROWTH] Service unavailable error detected');
      return res.status(503).json({ 
        message: 'Automation service is currently unavailable. Please try again later.',
        error: 'SERVICE_UNAVAILABLE'
      });
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('❌ [GROWTH] Timeout error detected');
      return res.status(408).json({ 
        message: 'Request to automation service timed out. Please try again.',
        error: 'TIMEOUT'
      });
    }

    console.log('❌ [GROWTH] Generic error response');
    res.status(500).json({ 
      message: 'Failed to trigger automation workflow. Please try again.',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Create or update the Company Persona
 * Supports both JWT authentication (frontend) and n8n API key authentication (n8n workflows)
 */
exports.upsertCompanyPersona = async (req, res) => {
  console.log('💾 [GROWTH] === UPSERT COMPANY PERSONA REQUEST ===');
  console.log(`💾 [GROWTH] Request body:`, {
    hasExecutiveSummary: !!req.body.executiveSummary,
    hasTargetMarketSweetSpot: !!req.body.targetMarketSweetSpot,
    hasSwotAnalysis: !!req.body.swotAnalysis,
    hasDetailedAnalysis: !!req.body.detailedAnalysis,
    hasTenantId: !!req.body.tenantId,
    executiveSummaryLength: req.body.executiveSummary?.length || 0,
    targetMarketSweetSpotLength: req.body.targetMarketSweetSpot?.length || 0,
    swotAnalysisType: typeof req.body.swotAnalysis,
    detailedAnalysisType: typeof req.body.detailedAnalysis
  });
  console.log(`💾 [GROWTH] Request headers:`, {
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer [HIDDEN]' : 'None',
    'x-api-key': req.headers['x-api-key'] ? 'API_KEY [HIDDEN]' : 'None'
  });
  
  try {
    // Determine tenant ID based on authentication method
    let tenantId;
    
    if (req.user?.tenantId) {
      // JWT authentication - get tenant from user context
      tenantId = req.user.tenantId;
      console.log(`🔐 [GROWTH] JWT authentication detected:`, {
        tenantId: tenantId,
        userId: req.user.id
      });
    } else if (req.headers['x-api-key']) {
      // n8n API key authentication - get tenant from request body
      tenantId = req.body.tenantId;
      console.log(`🔑 [GROWTH] n8n API key authentication detected:`, {
        tenantId: tenantId,
        apiKeyPresent: !!req.headers['x-api-key']
      });
      
      if (!tenantId) {
        console.log('❌ [GROWTH] Missing tenantId in request body for API key auth');
        return res.status(400).json({ 
          error: 'tenantId is required when using API key authentication' 
        });
      }
    } else {
      console.log('❌ [GROWTH] No authentication method detected');
      return res.status(401).json({ 
        error: 'Authentication required. Provide either Bearer token or x-api-key header with tenantId.' 
      });
    }

    // Validate UUID format for tenantId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(tenantId);
    console.log(`💾 [GROWTH] Tenant ID validation:`, {
      tenantId: tenantId,
      isValidUuid: isValidUuid
    });
    
    if (!isValidUuid) {
      console.log('❌ [GROWTH] Invalid UUID format for tenantId:', tenantId);
      return res.status(400).json({ 
        error: 'tenantId must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)' 
      });
    }

    // Extract structured persona data from request body
    const { 
      executiveSummary, 
      targetMarketSweetSpot, 
      swotAnalysis, 
      detailedAnalysis 
    } = req.body;
    
    console.log(`💾 [GROWTH] Structured persona data extraction:`, {
      hasExecutiveSummary: !!executiveSummary,
      hasTargetMarketSweetSpot: !!targetMarketSweetSpot,
      hasSwotAnalysis: !!swotAnalysis,
      hasDetailedAnalysis: !!detailedAnalysis,
      executiveSummaryLength: executiveSummary?.length || 0,
      targetMarketSweetSpotLength: targetMarketSweetSpot?.length || 0,
      swotAnalysisType: typeof swotAnalysis,
      detailedAnalysisType: typeof detailedAnalysis
    });

    // Validate required fields
    if (!executiveSummary || typeof executiveSummary !== 'string') {
      console.log('❌ [GROWTH] Invalid executiveSummary:', {
        executiveSummary: executiveSummary,
        type: typeof executiveSummary
      });
      return res.status(400).json({ 
        error: 'executiveSummary is required and must be a string' 
      });
    }

    if (!targetMarketSweetSpot || typeof targetMarketSweetSpot !== 'string') {
      console.log('❌ [GROWTH] Invalid targetMarketSweetSpot:', {
        targetMarketSweetSpot: targetMarketSweetSpot,
        type: typeof targetMarketSweetSpot
      });
      return res.status(400).json({ 
        error: 'targetMarketSweetSpot is required and must be a string' 
      });
    }

    if (!swotAnalysis || typeof swotAnalysis !== 'object') {
      console.log('❌ [GROWTH] Invalid swotAnalysis:', {
        swotAnalysis: swotAnalysis,
        type: typeof swotAnalysis
      });
      return res.status(400).json({ 
        error: 'swotAnalysis is required and must be an object' 
      });
    }

    if (!detailedAnalysis || typeof detailedAnalysis !== 'object') {
      console.log('❌ [GROWTH] Invalid detailedAnalysis:', {
        detailedAnalysis: detailedAnalysis,
        type: typeof detailedAnalysis
      });
      return res.status(400).json({ 
        error: 'detailedAnalysis is required and must be an object' 
      });
    }

    console.log(`💾 [GROWTH] Upserting structured persona for tenant: ${tenantId}`);

    const updatedPersona = await prisma.companyPersona.upsert({
      where: { tenantId: tenantId },
      update: { 
        executiveSummary: executiveSummary,
        targetMarketSweetSpot: targetMarketSweetSpot,
        swotAnalysis: swotAnalysis,
        detailedAnalysis: detailedAnalysis,
        updatedAt: new Date()
      },
      create: {
        tenantId: tenantId,
        executiveSummary: executiveSummary,
        targetMarketSweetSpot: targetMarketSweetSpot,
        swotAnalysis: swotAnalysis,
        detailedAnalysis: detailedAnalysis,
        isActive: true
      },
    });

    console.log(`✅ [GROWTH] Structured persona saved successfully:`, {
      id: updatedPersona.id,
      tenantId: updatedPersona.tenantId,
      isActive: updatedPersona.isActive,
      createdAt: updatedPersona.createdAt,
      updatedAt: updatedPersona.updatedAt,
      executiveSummaryLength: updatedPersona.executiveSummary?.length || 0,
      targetMarketSweetSpotLength: updatedPersona.targetMarketSweetSpot?.length || 0,
      hasSwotAnalysis: !!updatedPersona.swotAnalysis,
      hasDetailedAnalysis: !!updatedPersona.detailedAnalysis
    });
    
    // Send success response back to n8n or frontend
    const responseData = {
      message: 'Structured persona saved successfully.',
      persona: updatedPersona,
    };
    
    console.log('✅ [GROWTH] Sending success response:', {
      message: responseData.message,
      personaId: responseData.persona.id
    });
    console.log('✅ [GROWTH] === UPSERT COMPANY PERSONA SUCCESS ===');
    res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ [GROWTH] === UPSERT COMPANY PERSONA ERROR ===');
    console.error('❌ [GROWTH] Error saving company persona:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save company persona',
      details: error.message 
    });
  }
};

/**
 * Get all Growth Campaigns for the current tenant
 */
exports.getGrowthCampaigns = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    console.log(`🔍 [GROWTH] Fetching campaigns for tenant: ${tenantId}`);

    const campaigns = await prisma.growthCampaign.findMany({
      where: { tenantId: tenantId },
      include: {
        discoveredBrands: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ [GROWTH] Found ${campaigns.length} campaigns for tenant: ${tenantId}`);
    res.status(200).json(campaigns);
  } catch (error) {
    console.error('❌ [GROWTH] Error fetching growth campaigns:', error);
    res.status(500).json({ 
      error: 'Failed to fetch growth campaigns',
      details: error.message 
    });
  }
};

/**
 * Create a new Growth Campaign
 */
exports.createGrowthCampaign = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    const { name, keywords, region } = req.body;

    if (!name || !keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ 
        error: 'Name and keywords array are required' 
      });
    }

    console.log(`🚀 [GROWTH] Creating campaign for tenant: ${tenantId}`, { name, keywords, region });

    // Step 1: Create campaign with ANALYZING status
    const campaign = await prisma.growthCampaign.create({
      data: {
        tenantId: tenantId,
        name,
        keywords,
        region,
        status: 'ANALYZING'
      },
      include: {
        discoveredBrands: true
      }
    });

    console.log(`✅ [GROWTH] Campaign created: ${campaign.id}`);

    // Step 2: Trigger n8n Brand Discovery Workflow
    try {
      console.log(`🤖 [GROWTH] Triggering n8n brand discovery workflow for campaign: ${campaign.id}`);
      
      const n8nWebhookUrl = process.env.N8N_BRANDFINDER_WEBHOOK_URL;
      if (!n8nWebhookUrl) {
        console.log('⚠️ [GROWTH] N8N_BRANDFINDER_WEBHOOK_URL not configured, skipping workflow trigger');
      } else {
        const axios = require('axios');
        
        const workflowPayload = {
          campaignId: campaign.id,
          tenantId: tenantId,
          name: campaign.name,
          keywords: campaign.keywords,
          region: campaign.region
        };

        console.log(`🤖 [GROWTH] Calling n8n webhook:`, {
          url: n8nWebhookUrl,
          payload: workflowPayload
        });

        const response = await axios.post(n8nWebhookUrl, workflowPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.N8N_API_KEY
          },
          timeout: 10000 // 10 second timeout
        });

        console.log(`✅ [GROWTH] n8n workflow triggered successfully:`, {
          status: response.status,
          campaignId: campaign.id
        });
      }
    } catch (n8nError) {
      console.error(`❌ [GROWTH] Error triggering n8n workflow:`, n8nError.message);
      console.error(`❌ [GROWTH] n8n error details:`, {
        status: n8nError.response?.status,
        data: n8nError.response?.data,
        url: process.env.N8N_BRANDFINDER_WEBHOOK_URL
      });
      
      // Don't fail the campaign creation if n8n fails
      // Just log the error and continue
    }

    res.status(201).json(campaign);
  } catch (error) {
    console.error('❌ [GROWTH] Error creating growth campaign:', error);
    res.status(500).json({ 
      error: 'Failed to create growth campaign',
      details: error.message 
    });
  }
};

/**
 * Update Growth Campaign status
 */
exports.updateCampaignStatus = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    const { campaignId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    console.log(`🔄 [GROWTH] Updating campaign status: ${campaignId} -> ${status}`);

    const campaign = await prisma.growthCampaign.update({
      where: { 
        id: campaignId,
        tenantId: tenantId // Ensure tenant ownership
      },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        discoveredBrands: true
      }
    });

    console.log(`✅ [GROWTH] Campaign status updated: ${campaignId}`);
    res.status(200).json(campaign);
  } catch (error) {
    console.error('❌ [GROWTH] Error updating campaign status:', error);
    res.status(500).json({ 
      error: 'Failed to update campaign status',
      details: error.message 
    });
  }
};

/**
 * Get discovered brands for a campaign
 */
exports.getDiscoveredBrands = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    const { campaignId } = req.params;

    console.log(`🔍 [GROWTH] Fetching brands for campaign: ${campaignId}`);

    const brands = await prisma.discoveredBrand.findMany({
      where: { 
        campaignId: campaignId,
        campaign: {
          tenantId: tenantId // Ensure tenant ownership
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ [GROWTH] Found ${brands.length} brands for campaign: ${campaignId}`);
    res.status(200).json(brands);
  } catch (error) {
    console.error('❌ [GROWTH] Error fetching discovered brands:', error);
    res.status(500).json({ 
      error: 'Failed to fetch discovered brands',
      details: error.message 
    });
  }
};

/**
 * Update brand status
 */
exports.updateBrandStatus = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    const { brandId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    console.log(`🔄 [GROWTH] Updating brand status: ${brandId} -> ${status}`);

    const brand = await prisma.discoveredBrand.update({
      where: { 
        id: brandId,
        campaign: {
          tenantId: tenantId // Ensure tenant ownership
        }
      },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [GROWTH] Brand status updated: ${brandId}`);
    res.status(200).json(brand);
  } catch (error) {
    console.error('❌ [GROWTH] Error updating brand status:', error);
    res.status(500).json({ 
      error: 'Failed to update brand status',
      details: error.message 
    });
  }
};

/**
 * Save discovered brands from n8n workflow (n8n only)
 */
exports.saveDiscoveredBrands = async (req, res) => {
  console.log('💾 [GROWTH] === SAVE DISCOVERED BRANDS REQUEST ===');
  console.log(`💾 [GROWTH] Request body:`, {
    hasBrands: !!req.body.brands,
    brandsCount: req.body.brands?.length || 0,
    campaignId: req.params.campaignId
  });
  
  try {
    const { campaignId } = req.params;
    const { brands } = req.body;

    console.log(`💾 [GROWTH] Saving brands for campaign: ${campaignId}`);

    if (!brands || !Array.isArray(brands)) {
      console.log('❌ [GROWTH] Invalid brands data:', { brands, type: typeof brands });
      return res.status(400).json({ 
        error: 'Brands array is required' 
      });
    }

    // Verify campaign exists
    const campaign = await prisma.growthCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      console.log(`❌ [GROWTH] Campaign not found: ${campaignId}`);
      return res.status(404).json({ 
        error: 'Campaign not found' 
      });
    }

    console.log(`💾 [GROWTH] Campaign found: ${campaignId}, proceeding to save ${brands.length} brands`);

    // Save brands
    const savedBrands = await Promise.all(
      brands.map(async (brand) => {
        console.log(`💾 [GROWTH] Saving brand: ${brand.brandName}`);
        return prisma.discoveredBrand.create({
          data: {
            campaignId: campaignId,
            brandName: brand.brandName,
            website: brand.website,
            productFitAnalysis: brand.productFitAnalysis,
            status: 'DISCOVERED'
          }
        });
      })
    );

    console.log(`✅ [GROWTH] Saved ${savedBrands.length} brands for campaign: ${campaignId}`);
    console.log('✅ [GROWTH] === SAVE DISCOVERED BRANDS SUCCESS ===');
    
    res.status(201).json({
      message: `Successfully saved ${savedBrands.length} brands`,
      brands: savedBrands
    });
  } catch (error) {
    console.error('❌ [GROWTH] === SAVE DISCOVERED BRANDS ERROR ===');
    console.error('❌ [GROWTH] Error saving discovered brands:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save discovered brands',
      details: error.message 
    });
  }
};

/**
 * 🔧 INTERNAL SERVICE: Get Company Persona for a specific tenant
 * Fetches a Company Persona for a specific tenant.
 * Called by internal services (n8n) using API key authentication.
 * The tenant ID is provided as a URL parameter.
 */
exports.getPersonaForService = async (req, res) => {
  console.log('🔍 [GROWTH INTERNAL] === GET PERSONA FOR SERVICE REQUEST ===');
  
  const { tenantId } = req.params; // Get tenantId from the URL parameter
  
  console.log(`🔍 [GROWTH INTERNAL] Request details:`, {
    tenantId: tenantId,
    tenantIdType: typeof tenantId,
    hasApiKey: !!req.headers['x-api-key'],
    userAgent: req.headers['user-agent']
  });

  if (!tenantId) {
    console.log('❌ [GROWTH INTERNAL] Missing tenant ID in URL parameter');
    return res.status(400).json({ 
      error: 'Tenant ID is required in the URL path',
      message: 'Please provide tenantId as a URL parameter: /internal/persona/:tenantId' 
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    console.log(`❌ [GROWTH INTERNAL] Invalid tenant ID format: ${tenantId}`);
    return res.status(400).json({ 
      error: 'Invalid tenant ID format',
      message: 'Tenant ID must be a valid UUID' 
    });
  }

  try {
    console.log(`🔍 [GROWTH INTERNAL] Fetching persona for tenant: ${tenantId}`);
    
    const persona = await prisma.companyPersona.findUnique({
      where: { tenantId: tenantId },
    });

    if (!persona) {
      console.log(`❌ [GROWTH INTERNAL] Persona not found for tenant: ${tenantId}`);
      return res.status(404).json({ 
        error: 'Company Persona not found',
        message: `Company Persona not found for tenant: ${tenantId}` 
      });
    }

    console.log(`✅ [GROWTH INTERNAL] Persona found for tenant: ${tenantId}`, {
      id: persona.id,
      isActive: persona.isActive,
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt,
      executiveSummaryLength: persona.executiveSummary?.length || 0,
      targetMarketSweetSpotLength: persona.targetMarketSweetSpot?.length || 0,
      hasSwotAnalysis: !!persona.swotAnalysis,
      hasDetailedAnalysis: !!persona.detailedAnalysis
    });
    console.log('✅ [GROWTH INTERNAL] === GET PERSONA FOR SERVICE SUCCESS ===');
    
    res.status(200).json(persona);
  } catch (error) {
    console.error('❌ [GROWTH INTERNAL] === GET PERSONA FOR SERVICE ERROR ===');
    console.error(`❌ [GROWTH INTERNAL] Error fetching persona for tenant ${tenantId}:`, error);
    console.error('❌ [GROWTH INTERNAL] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Error fetching company persona',
      message: 'Internal server error while fetching company persona',
      details: error.message 
    });
  }
};

/**
 * 🆕 NEW: Get details for a specific campaign with discovered brands
 * Fetches details and discovered brands for a specific campaign.
 * Called by the frontend.
 */
exports.getCampaignDetails = async (req, res) => {
  console.log('🔍 [GROWTH] === GET CAMPAIGN DETAILS REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    const { campaignId } = req.params;
    console.log(`🔍 [GROWTH] Fetching details for campaign: ${campaignId}, tenant: ${tenantId}`);

    const campaign = await prisma.growthCampaign.findFirst({
      where: { 
        id: campaignId, 
        tenantId: tenantId // Ensure tenant ownership
      },
      include: {
        discoveredBrands: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!campaign) {
      console.log(`❌ [GROWTH] Campaign not found: ${campaignId} for tenant: ${tenantId}`);
      return res.status(404).json({ 
        error: 'Campaign not found',
        message: 'Campaign not found or you do not have permission to access it.'
      });
    }

    console.log(`✅ [GROWTH] Campaign details retrieved: ${campaignId}`, {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      brandsCount: campaign.discoveredBrands?.length || 0,
      keywordsCount: campaign.keywords?.length || 0
    });
    console.log('✅ [GROWTH] === GET CAMPAIGN DETAILS SUCCESS ===');
    
    res.status(200).json(campaign);
  } catch (error) {
    console.error('❌ [GROWTH] === GET CAMPAIGN DETAILS ERROR ===');
    console.error(`❌ [GROWTH] Error fetching details for campaign ${req.params.campaignId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch campaign details',
      details: error.message 
    });
  }
}; 