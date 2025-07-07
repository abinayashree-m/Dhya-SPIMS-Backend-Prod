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
        const companyName = brand.companyName || brand.brandName || brand.name || 'Unknown Company';
        console.log(`💾 [GROWTH] Saving brand: ${companyName}`);
        console.log(`💾 [GROWTH] Brand data:`, {
          companyName,
          website: brand.website,
          hasProductFitAnalysis: !!brand.productFitAnalysis,
          discoverySource: brand.discoverySource || 'n8n-brand-discovery'
        });
        
        return prisma.discoveredBrand.create({
          data: {
            campaignId: campaignId,
            companyName: companyName,
            website: brand.website,
            productFitAnalysis: brand.productFitAnalysis || 'No analysis provided',
            discoverySource: brand.discoverySource || 'n8n-brand-discovery',
            status: 'DISCOVERED'
          }
        });
      })
    );

    console.log(`✅ [GROWTH] Saved ${savedBrands.length} brands for campaign: ${campaignId}`);
    
    // Update campaign status to COMPLETED after saving brands
    await prisma.growthCampaign.update({
      where: { id: campaignId },
      data: { status: 'COMPLETED' }
    });
    
    console.log(`✅ [GROWTH] Updated campaign status to COMPLETED for campaign: ${campaignId}`);
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
          orderBy: { createdAt: 'asc' },
          include: {
            discoveredSuppliers: {
              orderBy: [
                { relevanceScore: 'desc' },
                { createdAt: 'desc' }
              ]
            }
          }
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

/**
 * 🔍 SUPPLIER DISCOVERY: Trigger supplier search for a brand
 * Initiates the n8n workflow to find suppliers for a specific brand.
 * Called by the frontend.
 */
exports.findSuppliersForBrand = async (req, res) => {
  console.log('🔍 [GROWTH] === FIND SUPPLIERS FOR BRAND REQUEST ===');
  
  try {
    const { brandId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    console.log(`🔍 [GROWTH] Finding suppliers for brand: ${brandId}, tenant: ${tenantId}`);

    // Verify brand exists and belongs to tenant
    const brand = await prisma.discoveredBrand.findFirst({
      where: { 
        id: brandId,
        campaign: {
          tenantId: tenantId // Ensure tenant ownership
        }
      },
      include: {
        campaign: true
      }
    });

    if (!brand) {
      console.log(`❌ [GROWTH] Brand not found: ${brandId} for tenant: ${tenantId}`);
      return res.status(404).json({ 
        error: 'Brand not found',
        message: 'Brand not found or you do not have permission to access it.'
      });
    }

    console.log(`✅ [GROWTH] Brand found: ${brand.companyName}, triggering supplier discovery`);

    // Trigger n8n workflow for supplier discovery
    const webhookUrl = process.env.N8N_SUPPLIERFINDER_WEBHOOK_URL;
    if (webhookUrl) {
      console.log(`🔗 [GROWTH] Triggering n8n SupplierFinder workflow for brand: ${brandId}`);
      
      // Send brand info to n8n workflow
      axios.post(webhookUrl, {
        brandId: brand.id,
        companyName: brand.companyName,
        website: brand.website,
        campaignId: brand.campaignId,
        tenantId: tenantId
      }).catch(err => {
        console.error(`❌ [GROWTH] Failed to trigger SupplierFinder workflow for brand ${brandId}:`, err.message);
      });
    } else {
      console.log('⚠️ [GROWTH] N8N_SUPPLIERFINDER_WEBHOOK_URL not configured, skipping workflow trigger');
    }

    // Update brand status to indicate supplier discovery is in progress
    await prisma.discoveredBrand.update({
      where: { id: brandId },
      data: { status: 'SUPPLIERS_IDENTIFIED' }
    });

    console.log(`✅ [GROWTH] Supplier discovery initiated for brand: ${brandId}`);
    console.log('✅ [GROWTH] === FIND SUPPLIERS FOR BRAND SUCCESS ===');
    
    res.status(202).json({ 
      message: 'Supplier discovery process initiated',
      brandId: brandId,
      brandName: brand.companyName
    });
  } catch (error) {
    console.error('❌ [GROWTH] === FIND SUPPLIERS FOR BRAND ERROR ===');
    console.error(`❌ [GROWTH] Error finding suppliers for brand ${req.params.brandId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to start supplier discovery',
      details: error.message 
    });
  }
};

/**
 * 💾 WEBHOOK: Save discovered suppliers from n8n
 * Saves suppliers found by the n8n workflow to the database.
 * Called by n8n via webhook with API key authentication.
 */
exports.saveDiscoveredSuppliers = async (req, res) => {
  console.log('💾 [GROWTH] === SAVE DISCOVERED SUPPLIERS REQUEST ===');
  
  try {
    const { brandId } = req.params;
    const { suppliers } = req.body;

    console.log(`💾 [GROWTH] Request details:`, {
      brandId: brandId,
      suppliersCount: suppliers?.length || 0,
      hasApiKey: !!req.headers['x-api-key'],
      userAgent: req.headers['user-agent']
    });

    if (!suppliers || !Array.isArray(suppliers)) {
      console.log('❌ [GROWTH] Invalid suppliers data - must be an array');
      return res.status(400).json({ 
        error: 'Invalid request body',
        message: 'Request body must contain a "suppliers" array.'
      });
    }

    console.log(`💾 [GROWTH] Processing ${suppliers.length} suppliers for brand: ${brandId}`);

    // Verify brand exists
    const brand = await prisma.discoveredBrand.findUnique({
      where: { id: brandId }
    });

    if (!brand) {
      console.log(`❌ [GROWTH] Brand not found: ${brandId}`);
      return res.status(404).json({ 
        error: 'Brand not found',
        message: `Brand with ID ${brandId} not found.`
      });
    }

    console.log(`💾 [GROWTH] Brand found: ${brand.companyName}, proceeding to save suppliers`);

    // Save suppliers
    const suppliersData = suppliers.map(supplier => ({
      discoveredBrandId: brandId,
      companyName: supplier.companyName || supplier.name || 'Unknown Supplier',
      country: supplier.country,
      specialization: supplier.specialization,
      sourceUrl: supplier.sourceUrl,
      relevanceScore: supplier.relevanceScore || 0
    }));

    console.log(`💾 [GROWTH] Saving ${suppliersData.length} suppliers:`, 
      suppliersData.map(s => ({ name: s.companyName, country: s.country, specialization: s.specialization }))
    );

    // Create suppliers and get their IDs
    const createdSuppliers = await Promise.all(
      suppliersData.map(async (supplierData) => {
        return await prisma.discoveredSupplier.create({
          data: supplierData
        });
      })
    );

    // Update brand status to indicate suppliers have been identified
    await prisma.discoveredBrand.update({
      where: { id: brandId },
      data: { status: 'SUPPLIERS_IDENTIFIED' }
    });

    console.log(`✅ [GROWTH] Successfully saved ${suppliers.length} suppliers for brand: ${brandId}`);
    console.log(`✅ [GROWTH] Created supplier IDs:`, createdSuppliers.map(s => ({ id: s.id, name: s.companyName })));
    console.log('✅ [GROWTH] === SAVE DISCOVERED SUPPLIERS SUCCESS ===');
    
    res.status(201).json({ 
      message: `Successfully saved ${suppliers.length} suppliers`,
      brandId: brandId,
      suppliersCount: suppliers.length,
      suppliers: createdSuppliers.map(s => ({
        id: s.id,
        companyName: s.companyName,
        country: s.country,
        specialization: s.specialization,
        relevanceScore: s.relevanceScore
      }))
    });
  } catch (error) {
    console.error('❌ [GROWTH] === SAVE DISCOVERED SUPPLIERS ERROR ===');
    console.error('❌ [GROWTH] Error saving discovered suppliers:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save discovered suppliers',
      details: error.message 
    });
  }
};

/**
 * 📋 GET DISCOVERED SUPPLIERS: Retrieve suppliers for a brand
 * Called by the frontend to get discovered suppliers for a specific brand.
 */
exports.getDiscoveredSuppliers = async (req, res) => {
  console.log('📋 [GROWTH] === GET DISCOVERED SUPPLIERS REQUEST ===');
  
  try {
    const { brandId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    console.log(`📋 [GROWTH] Getting suppliers for brand: ${brandId}, tenant: ${tenantId}`);

    // First verify the brand exists and belongs to the tenant
    const brand = await prisma.discoveredBrand.findFirst({
      where: { 
        id: brandId,
        campaign: {
          tenantId: tenantId
        }
      },
      include: {
        discoveredSuppliers: {
          orderBy: [
            { relevanceScore: 'desc' },
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!brand) {
      console.log(`❌ [GROWTH] Brand not found or unauthorized: ${brandId}`);
      return res.status(404).json({ error: 'Brand not found or unauthorized' });
    }

    console.log(`✅ [GROWTH] Found ${brand.discoveredSuppliers?.length || 0} suppliers for brand: ${brandId}`);
    console.log('✅ [GROWTH] === GET DISCOVERED SUPPLIERS SUCCESS ===');
    
    res.status(200).json(brand.discoveredSuppliers || []);
  } catch (error) {
    console.error('❌ [GROWTH] Error getting discovered suppliers:', error);
    res.status(500).json({ 
      error: 'Failed to get discovered suppliers',
      details: error.message 
    });
  }
};

/**
 * 👥 WEBHOOK: Save target contacts from n8n
 * Saves contacts found by the n8n workflow for a specific supplier.
 * Called by n8n via webhook with API key authentication.
 */
exports.saveTargetContacts = async (req, res) => {
  console.log('👥 [GROWTH] === SAVE TARGET CONTACTS REQUEST ===');
  
  try {
    const { supplierId } = req.params;
    const { contacts } = req.body;

    console.log(`👥 [GROWTH] Request details:`, {
      supplierId: supplierId,
      contactsCount: contacts?.length || 0,
      hasApiKey: !!req.headers['x-api-key'],
      userAgent: req.headers['user-agent']
    });

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(supplierId)) {
      console.log(`❌ [GROWTH] Invalid supplierId format: ${supplierId}`);
      console.log(`❌ [GROWTH] Expected UUID format (e.g., 3bf9bed5-d468-47c5-9c19-61a7e37faedc), got: ${supplierId}`);
      return res.status(400).json({ 
        error: 'Invalid supplier ID format',
        message: `Supplier ID must be in UUID format (e.g., 3bf9bed5-d468-47c5-9c19-61a7e37faedc). Received: ${supplierId}`,
        details: 'n8n workflow should use the UUID returned from the saveDiscoveredSuppliers endpoint'
      });
    }

    if (!contacts || !Array.isArray(contacts)) {
      console.log('❌ [GROWTH] Invalid contacts data - must be an array');
      return res.status(400).json({ 
        error: 'Invalid request body',
        message: 'Request body must contain a "contacts" array.'
      });
    }

    console.log(`👥 [GROWTH] Processing ${contacts.length} contacts for supplier: ${supplierId}`);

    // Verify supplier exists
    const supplier = await prisma.discoveredSupplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      console.log(`❌ [GROWTH] Supplier not found: ${supplierId}`);
      return res.status(404).json({ 
        error: 'Supplier not found',
        message: `Supplier with ID ${supplierId} not found.`
      });
    }

    console.log(`👥 [GROWTH] Supplier found: ${supplier.companyName}, proceeding to save contacts`);

    // Save contacts
    const contactsData = contacts.map(contact => ({
      discoveredSupplierId: supplierId,
      name: contact.name || contact.fullName || 'Unknown Contact',
      title: contact.title || contact.jobTitle,
      email: contact.email,
      linkedinUrl: contact.linkedinUrl || contact.linkedin_url,
      source: contact.source || 'n8n-apollo-enrichment'
    }));

    console.log(`👥 [GROWTH] Saving ${contactsData.length} contacts:`, 
      contactsData.map(c => ({ name: c.name, title: c.title, email: c.email }))
    );

    await prisma.targetContact.createMany({ 
      data: contactsData,
      skipDuplicates: true // Prevents errors if an email already exists
    });

    // Update associated brand status to indicate contacts have been enriched
    await prisma.discoveredBrand.update({
      where: { id: supplier.discoveredBrandId },
      data: { status: 'CONTACTS_ENRICHED' }
    });

    console.log(`✅ [GROWTH] Successfully saved ${contacts.length} contacts for supplier: ${supplierId}`);
    console.log('✅ [GROWTH] === SAVE TARGET CONTACTS SUCCESS ===');
    
    res.status(201).json({ 
      message: `Successfully processed ${contacts.length} contacts`,
      supplierId: supplierId,
      contactsCount: contacts.length
    });
  } catch (error) {
    console.error('❌ [GROWTH] === SAVE TARGET CONTACTS ERROR ===');
    console.error('❌ [GROWTH] Error saving target contacts:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save target contacts',
      details: error.message 
    });
  }
};

/**
 * 📋 GET TARGET CONTACTS: Retrieve contacts for a supplier
 * Called by the frontend to get target contacts for a specific supplier.
 */
exports.getTargetContacts = async (req, res) => {
  console.log('📋 [GROWTH] === GET TARGET CONTACTS REQUEST ===');
  
  try {
    const { supplierId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    console.log(`📋 [GROWTH] Getting contacts for supplier: ${supplierId}, tenant: ${tenantId}`);

    // First verify the supplier exists and belongs to the tenant
    const supplier = await prisma.discoveredSupplier.findFirst({
      where: { 
        id: supplierId,
        discoveredBrand: {
          campaign: {
            tenantId: tenantId
          }
        }
      },
      include: {
        targetContacts: {
          orderBy: [
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!supplier) {
      console.log(`❌ [GROWTH] Supplier not found or unauthorized: ${supplierId}`);
      return res.status(404).json({ error: 'Supplier not found or unauthorized' });
    }

    console.log(`✅ [GROWTH] Found ${supplier.targetContacts?.length || 0} contacts for supplier: ${supplierId}`);
    console.log('✅ [GROWTH] === GET TARGET CONTACTS SUCCESS ===');
    
    res.status(200).json(supplier.targetContacts || []);
  } catch (error) {
    console.error('❌ [GROWTH] Error getting target contacts:', error);
    res.status(500).json({ 
      error: 'Failed to get target contacts',
      details: error.message 
    });
  }
};

/**
 * ✉️ GENERATE OUTREACH DRAFT: Trigger email generation for a contact
 * Triggers the n8n workflow to generate a draft email for a specific contact.
 * Called by the frontend.
 */
exports.generateOutreachDraft = async (req, res) => {
  console.log('✉️ [GROWTH] === GENERATE OUTREACH DRAFT REQUEST ===');
  
  try {
    const { contactId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

    console.log(`✉️ [GROWTH] Generating draft for contact: ${contactId}, tenant: ${tenantId}`);

    // First verify the contact exists and belongs to the tenant
    const contact = await prisma.targetContact.findFirst({
      where: { 
        id: contactId,
        discoveredSupplier: {
          discoveredBrand: {
            campaign: {
              tenantId: tenantId
            }
          }
        }
      },
      include: {
        discoveredSupplier: {
          include: {
            discoveredBrand: {
              include: {
                campaign: true
              }
            }
          }
        }
      }
    });

    if (!contact) {
      console.log(`❌ [GROWTH] Contact not found or unauthorized: ${contactId}`);
      return res.status(404).json({ 
        error: 'Contact not found',
        message: 'Contact not found or you do not have permission to access it.'
      });
    }

    console.log(`✅ [GROWTH] Contact found: ${contact.name} at ${contact.discoveredSupplier.companyName}`);

    // Trigger n8n workflow for draft generation
    const webhookUrl = process.env.N8N_DRAFTGENERATOR_WEBHOOK_URL;
    if (webhookUrl) {
      console.log(`🔗 [GROWTH] Triggering n8n DraftGenerator workflow for contact: ${contactId}`);
      
      // Send full contact context to n8n workflow
      axios.post(webhookUrl, {
        contact: {
          id: contact.id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          linkedinUrl: contact.linkedinUrl,
          supplier: {
            id: contact.discoveredSupplier.id,
            companyName: contact.discoveredSupplier.companyName,
            country: contact.discoveredSupplier.country,
            specialization: contact.discoveredSupplier.specialization,
          },
          brand: {
            id: contact.discoveredSupplier.discoveredBrand.id,
            companyName: contact.discoveredSupplier.discoveredBrand.companyName,
            website: contact.discoveredSupplier.discoveredBrand.website,
          },
          campaign: {
            id: contact.discoveredSupplier.discoveredBrand.campaign.id,
            name: contact.discoveredSupplier.discoveredBrand.campaign.name,
            keywords: contact.discoveredSupplier.discoveredBrand.campaign.keywords,
            region: contact.discoveredSupplier.discoveredBrand.campaign.region,
          }
        },
        tenantId: tenantId
      }).catch(err => {
        console.error(`❌ [GROWTH] Failed to trigger DraftGenerator workflow for contact ${contactId}:`, err.message);
      });
    } else {
      console.log('⚠️ [GROWTH] N8N_DRAFTGENERATOR_WEBHOOK_URL not configured, skipping workflow trigger');
    }

    console.log(`✅ [GROWTH] Email draft generation initiated for contact: ${contactId}`);
    console.log('✅ [GROWTH] === GENERATE OUTREACH DRAFT SUCCESS ===');
    
    res.status(202).json({ 
      message: 'Email draft generation initiated',
      contactId: contactId,
      contactName: contact.name,
      supplierName: contact.discoveredSupplier.companyName
    });
  } catch (error) {
    console.error('❌ [GROWTH] === GENERATE OUTREACH DRAFT ERROR ===');
    console.error(`❌ [GROWTH] Error generating draft for contact ${req.params.contactId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to start draft generation',
      details: error.message 
    });
  }
};

/**
 * ✉️ SAVE OUTREACH EMAIL: Save generated email draft from n8n
 * Called by n8n workflow after generating an email draft.
 * Uses n8n authentication (API key).
 */
exports.saveOutreachEmail = async (req, res) => {
  console.log('✉️ [GROWTH] === SAVE OUTREACH EMAIL REQUEST ===');
  
  try {
    const { contactId, subject, body, serviceMessageId, tenantId } = req.body;
    
    if (!contactId || !subject || !body) {
      console.log('❌ [GROWTH] Missing required fields in request body');
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['contactId', 'subject', 'body'],
        received: Object.keys(req.body)
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(contactId)) {
      console.log(`❌ [GROWTH] Invalid UUID format for contactId: ${contactId}`);
      return res.status(400).json({ 
        error: 'Invalid contactId format',
        message: 'contactId must be a valid UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)',
        received: contactId
      });
    }

    console.log(`✉️ [GROWTH] Saving email draft for contact: ${contactId}`);
    console.log(`✉️ [GROWTH] Subject: ${subject}`);
    console.log(`✉️ [GROWTH] Body length: ${body?.length || 0} characters`);

    // First verify the contact exists and belongs to the tenant (if tenantId provided)
    const whereClause = { id: contactId };
    if (tenantId) {
      whereClause.discoveredSupplier = {
        discoveredBrand: {
          campaign: {
            tenantId: tenantId
          }
        }
      };
    }

    const contact = await prisma.targetContact.findFirst({
      where: whereClause,
      include: {
        discoveredSupplier: {
          include: {
            discoveredBrand: {
              include: {
                campaign: true
              }
            }
          }
        }
      }
    });

    if (!contact) {
      console.log(`❌ [GROWTH] Contact not found: ${contactId}`);
      return res.status(404).json({ 
        error: 'Contact not found',
        contactId: contactId
      });
    }

    console.log(`✅ [GROWTH] Contact found: ${contact.name} at ${contact.discoveredSupplier.companyName}`);

    // Save the outreach email draft
    const outreachEmail = await prisma.outreachEmail.create({
      data: {
        subject: subject,
        body: body,
        serviceMessageId: serviceMessageId || null,
        status: 'DRAFT',
        targetContactId: contactId
      }
    });

    console.log(`✅ [GROWTH] Email draft saved with ID: ${outreachEmail.id}`);
    console.log('✅ [GROWTH] === SAVE OUTREACH EMAIL SUCCESS ===');
    
    res.status(201).json({ 
      message: 'Email draft saved successfully',
      outreachEmailId: outreachEmail.id,
      contactId: contactId,
      contactName: contact.name,
      supplierName: contact.discoveredSupplier.companyName,
      subject: subject
    });
  } catch (error) {
    console.error('❌ [GROWTH] === SAVE OUTREACH EMAIL ERROR ===');
    console.error('❌ [GROWTH] Error saving outreach email:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save outreach email',
      details: error.message 
    });
  }
};

/**
 * 📧 GET OUTREACH EMAILS: Get saved email drafts for a contact
 * Used by frontend to display generated email drafts.
 * Uses JWT authentication.
 */
exports.getOutreachEmails = async (req, res) => {
  console.log('📧 [GROWTH] === GET OUTREACH EMAILS REQUEST ===');
  
  try {
    const { contactId } = req.params;
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📧 [GROWTH] Getting outreach emails for contact: ${contactId}, tenant: ${tenantId}`);

    // First verify the contact exists and belongs to the tenant
    const contact = await prisma.targetContact.findFirst({
      where: { 
        id: contactId,
        discoveredSupplier: {
          discoveredBrand: {
            campaign: {
              tenantId: tenantId
            }
          }
        }
      },
      include: {
        discoveredSupplier: {
          include: {
            discoveredBrand: {
              include: {
                campaign: true
              }
            }
          }
        }
      }
    });

    if (!contact) {
      console.log(`❌ [GROWTH] Contact not found or unauthorized: ${contactId}`);
      return res.status(404).json({ 
        error: 'Contact not found',
        message: 'Contact not found or you do not have permission to access it.'
      });
    }

    console.log(`✅ [GROWTH] Contact found: ${contact.name} at ${contact.discoveredSupplier.companyName}`);

    // Get all outreach emails for this contact
    const outreachEmails = await prisma.outreachEmail.findMany({
      where: {
        targetContactId: contactId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ [GROWTH] Found ${outreachEmails.length} outreach emails for contact: ${contactId}`);
    console.log('✅ [GROWTH] === GET OUTREACH EMAILS SUCCESS ===');
    
    res.status(200).json({
      contactId: contactId,
      contactName: contact.name,
      supplierName: contact.discoveredSupplier.companyName,
      outreachEmails: outreachEmails
    });
  } catch (error) {
    console.error('❌ [GROWTH] === GET OUTREACH EMAILS ERROR ===');
    console.error(`❌ [GROWTH] Error getting outreach emails for contact ${req.params.contactId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get outreach emails',
      details: error.message 
    });
  }
};

/**
 * 📧 GET OUTREACH EMAIL: Fetch a single email draft for n8n sending workflow
 * Called by n8n workflow when preparing to send an approved email draft.
 * Uses n8n authentication (API key).
 */
exports.getOutreachEmail = async (req, res) => {
  console.log('📧 [GROWTH] === GET OUTREACH EMAIL REQUEST ===');
  
  try {
    const { emailId } = req.params;
    
    if (!emailId) {
      console.log('❌ [GROWTH] Missing emailId parameter');
      return res.status(400).json({ error: 'Missing emailId parameter' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(emailId)) {
      console.log(`❌ [GROWTH] Invalid UUID format for emailId: ${emailId}`);
      return res.status(400).json({ 
        error: 'Invalid emailId format',
        message: 'emailId must be a valid UUID',
        received: emailId
      });
    }

    console.log(`📧 [GROWTH] Fetching email draft: ${emailId}`);

    const email = await prisma.outreachEmail.findUnique({
      where: { id: emailId },
      include: { 
        targetContact: true // Include contact to get the recipient's email
      }
    });

    if (!email) {
      console.log(`❌ [GROWTH] Email draft not found: ${emailId}`);
      return res.status(404).json({ 
        error: 'Email draft not found',
        emailId: emailId
      });
    }

    console.log(`✅ [GROWTH] Email draft found: ${email.subject}`);
    console.log(`✅ [GROWTH] Recipient: ${email.targetContact.email}`);
    console.log('✅ [GROWTH] === GET OUTREACH EMAIL SUCCESS ===');
    
    res.status(200).json(email);
  } catch (error) {
    console.error('❌ [GROWTH] === GET OUTREACH EMAIL ERROR ===');
    console.error(`❌ [GROWTH] Error fetching email draft ${req.params.emailId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch email draft',
      details: error.message 
    });
  }
};

/**
 * 📤 UPDATE EMAIL AS SENT: Update an email's status to SENT after n8n sends it
 * Called by n8n workflow after successfully sending an email.
 * Uses n8n authentication (API key).
 */
exports.updateEmailAsSent = async (req, res) => {
  console.log('📤 [GROWTH] === UPDATE EMAIL AS SENT REQUEST ===');
  
  try {
    const { emailId } = req.params;
    const { serviceMessageId } = req.body;
    
    if (!emailId) {
      console.log('❌ [GROWTH] Missing emailId parameter');
      return res.status(400).json({ error: 'Missing emailId parameter' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(emailId)) {
      console.log(`❌ [GROWTH] Invalid UUID format for emailId: ${emailId}`);
      return res.status(400).json({ 
        error: 'Invalid emailId format',
        message: 'emailId must be a valid UUID',
        received: emailId
      });
    }

    console.log(`📤 [GROWTH] Updating email status to SENT: ${emailId}`);
    console.log(`📤 [GROWTH] Service message ID: ${serviceMessageId || 'Not provided'}`);

    const updatedEmail = await prisma.outreachEmail.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        serviceMessageId: serviceMessageId || null
      }
    });

    console.log(`✅ [GROWTH] Email marked as SENT: ${updatedEmail.id}`);
    console.log('✅ [GROWTH] === UPDATE EMAIL AS SENT SUCCESS ===');
    
    res.status(200).json({
      message: 'Email status updated to SENT successfully',
      emailId: updatedEmail.id,
      status: updatedEmail.status,
      sentAt: updatedEmail.sentAt,
      serviceMessageId: updatedEmail.serviceMessageId
    });
  } catch (error) {
    console.error('❌ [GROWTH] === UPDATE EMAIL AS SENT ERROR ===');
    console.error(`❌ [GROWTH] Error updating email status ${req.params.emailId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    
    // Check if it's a record not found error
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: 'Email draft not found',
        emailId: req.params.emailId
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update email status',
      details: error.message 
    });
  }
}; 