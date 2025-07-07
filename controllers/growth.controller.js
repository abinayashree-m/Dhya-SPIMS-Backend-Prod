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
      timeout: 100000, // 30 second timeout
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
          timeout: 100000 // 10 second timeout
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

/**
 * 📧 PROCESS EMAIL EVENT: Handle incoming email events from Resend via n8n webhook
 * Called by n8n workflow when email events occur (replied, bounced, etc.)
 * Uses n8n authentication (API key).
 */
exports.processEmailEvent = async (req, res) => {
  console.log('📧 [GROWTH] === PROCESS EMAIL EVENT REQUEST ===');
  
  try {
    const event = req.body;
    
    if (!event || !event.type) {
      console.log('❌ [GROWTH] Missing event type in request body');
      return res.status(400).json({ 
        error: 'Missing event type',
        message: 'Event type is required',
        received: event
      });
    }

    console.log(`📧 [GROWTH] Processing email event: ${event.type}`);
    console.log(`📧 [GROWTH] Event data:`, {
      type: event.type,
      hasData: !!event.data,
      emailId: event.data?.email_id || 'Not provided'
    });

    if (!event.data?.email_id) {
      console.log('❌ [GROWTH] Missing email_id in event data');
      return res.status(400).json({ 
        error: 'Missing email_id in event data',
        eventType: event.type
      });
    }

    // Find the original email by service message ID with all necessary relations
    const originalEmail = await prisma.outreachEmail.findFirst({
      where: { serviceMessageId: event.data.email_id },
      include: { 
        targetContact: {
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
        }
      }
    });

    if (!originalEmail) {
      console.log(`❌ [GROWTH] Original email not found for service message ID: ${event.data.email_id}`);
      return res.status(200).json({ 
        message: 'Event for an unknown email, ignored',
        serviceMessageId: event.data.email_id
      });
    }

    console.log(`✅ [GROWTH] Found original email: ${originalEmail.subject}`);
    console.log(`✅ [GROWTH] Contact: ${originalEmail.targetContact.name} at ${originalEmail.targetContact.discoveredSupplier.companyName}`);

    // Get tenantId from the campaign
    const tenantId = originalEmail.targetContact.discoveredSupplier.discoveredBrand.campaign.tenantId;

    switch (event.type) {
      case 'email.replied':
        console.log(`📧 [GROWTH] Processing email reply event`);
        
        // Update the email status if not already marked as replied
        if (originalEmail.status !== 'REPLIED') {
          await prisma.outreachEmail.update({
            where: { id: originalEmail.id },
            data: { status: 'REPLIED' }
          });
          console.log(`✅ [GROWTH] Updated email status to REPLIED: ${originalEmail.id}`);
        }

        // Check if a follow-up task already exists for this email
        const existingTask = await prisma.followUpTask.findUnique({
          where: { relatedEmailId: originalEmail.id }
        });

        if (!existingTask) {
          // Create a high-priority follow-up task
          const followUpTask = await prisma.followUpTask.create({
            data: {
              tenantId: tenantId,
              title: `Reply from: ${originalEmail.targetContact.name}`,
              notes: `Received a reply to the email with subject: "${originalEmail.subject}". Contact: ${originalEmail.targetContact.name} at ${originalEmail.targetContact.discoveredSupplier.companyName}. Original message ID: ${originalEmail.serviceMessageId}`,
              priority: 'HIGH',
              status: 'TODO',
              relatedEmailId: originalEmail.id,
              relatedContactId: originalEmail.targetContactId
            }
          });

          console.log(`✅ [GROWTH] Created follow-up task: ${followUpTask.id}`);
        } else {
          console.log(`ℹ️ [GROWTH] Follow-up task already exists for email: ${originalEmail.id}`);
        }
        break;

      case 'email.complained':
        console.log(`📧 [GROWTH] Processing email complaint event`);
        
        // Update email status to FAILED
        await prisma.outreachEmail.update({
          where: { id: originalEmail.id },
          data: { status: 'FAILED' }
        });

        // Mark contact as DO_NOT_CONTACT
        await prisma.targetContact.update({
          where: { id: originalEmail.targetContactId },
          data: { status: 'DO_NOT_CONTACT' }
        });

        console.log(`✅ [GROWTH] Updated email status to FAILED and contact to DO_NOT_CONTACT for complaint`);
        break;

      case 'email.bounced':
        console.log(`📧 [GROWTH] Processing email bounce event`);
        
        // Update email status to FAILED
        await prisma.outreachEmail.update({
          where: { id: originalEmail.id },
          data: { status: 'FAILED' }
        });

        // Mark contact as DO_NOT_CONTACT
        await prisma.targetContact.update({
          where: { id: originalEmail.targetContactId },
          data: { status: 'DO_NOT_CONTACT' }
        });

        console.log(`✅ [GROWTH] Updated email status to FAILED and contact to DO_NOT_CONTACT for bounce`);
        break;

      case 'email.opened':
        console.log(`📧 [GROWTH] Processing email opened event`);
        
        // Create an engagement event record
        const openedEvent = await prisma.outreachEmailEvent.create({
          data: {
            outreachEmailId: originalEmail.id,
            type: 'OPENED',
            ipAddress: event.data?.ip || null,
            userAgent: event.data?.user_agent || null
          }
        });

        console.log(`✅ [GROWTH] Created email opened event: ${openedEvent.id} for email: ${originalEmail.id}`);
        break;

      case 'email.clicked':
        console.log(`📧 [GROWTH] Processing email clicked event`);
        
        // Create an engagement event record
        const clickedEvent = await prisma.outreachEmailEvent.create({
          data: {
            outreachEmailId: originalEmail.id,
            type: 'CLICKED',
            ipAddress: event.data?.ip || null,
            userAgent: event.data?.user_agent || null
          }
        });

        console.log(`✅ [GROWTH] Created email clicked event: ${clickedEvent.id} for email: ${originalEmail.id}`);
        break;

      default:
        console.log(`ℹ️ [GROWTH] Unhandled event type: ${event.type}`);
        // For other event types, we just acknowledge receipt but don't process
        break;
    }

    console.log('✅ [GROWTH] === PROCESS EMAIL EVENT SUCCESS ===');
    res.status(200).json({ 
      message: 'Event processed successfully',
      eventType: event.type,
      processed: true
    });

  } catch (error) {
    console.error('❌ [GROWTH] === PROCESS EMAIL EVENT ERROR ===');
    console.error('❌ [GROWTH] Error processing email event:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process email event',
      details: error.message 
    });
  }
};

/**
 * 🚫 CHECK CONTACT SUPPRESSION: Check if a contact is suppressed (DO_NOT_CONTACT)
 * Called by frontend before generating drafts or sending emails.
 * Uses JWT authentication.
 */
exports.checkContactSuppression = async (req, res) => {
  console.log('🚫 [GROWTH] === CHECK CONTACT SUPPRESSION REQUEST ===');
  
  try {
    const { contactId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(contactId)) {
      console.log(`❌ [GROWTH] Invalid UUID format for contactId: ${contactId}`);
      return res.status(400).json({ 
        error: 'Invalid contactId format',
        message: 'contactId must be a valid UUID',
        received: contactId
      });
    }

    console.log(`🚫 [GROWTH] Checking suppression for contact: ${contactId}, tenant: ${tenantId}`);

    // Find the contact and verify tenant ownership
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
            discoveredBrand: true
          }
        }
      }
    });

    if (!contact) {
      console.log(`❌ [GROWTH] Contact not found: ${contactId} for tenant: ${tenantId}`);
      return res.status(404).json({ 
        error: 'Contact not found',
        message: 'Contact not found or you do not have permission to access it.'
      });
    }

    const suppressionStatus = {
      contactId: contact.id,
      name: contact.name,
      email: contact.email,
      company: contact.discoveredSupplier.companyName,
      status: contact.status,
      isSuppressed: contact.status === 'DO_NOT_CONTACT',
      canSendEmail: contact.status === 'ACTIVE'
    };

    console.log(`✅ [GROWTH] Contact suppression status retrieved for: ${contactId}`, {
      status: suppressionStatus.status,
      isSuppressed: suppressionStatus.isSuppressed,
      canSendEmail: suppressionStatus.canSendEmail
    });
    console.log('✅ [GROWTH] === CHECK CONTACT SUPPRESSION SUCCESS ===');
    
    res.status(200).json(suppressionStatus);

  } catch (error) {
    console.error('❌ [GROWTH] === CHECK CONTACT SUPPRESSION ERROR ===');
    console.error(`❌ [GROWTH] Error checking contact suppression for contact ${req.params.contactId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to check contact suppression status',
      details: error.message 
    });
  }
};

/**
 * 📊 GET EMAIL ENGAGEMENT STATS: Get engagement statistics for outreach emails
 * Called by frontend to display email engagement metrics.
 * Uses JWT authentication.
 */
exports.getEmailEngagementStats = async (req, res) => {
  console.log('📊 [GROWTH] === GET EMAIL ENGAGEMENT STATS REQUEST ===');
  
  try {
    const { emailId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
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

    console.log(`📊 [GROWTH] Fetching engagement stats for email: ${emailId}, tenant: ${tenantId}`);

    // First verify the email exists and belongs to the tenant
    const email = await prisma.outreachEmail.findFirst({
      where: { 
        id: emailId,
        targetContact: {
          discoveredSupplier: {
            discoveredBrand: {
              campaign: {
                tenantId: tenantId
              }
            }
          }
        }
      },
      include: {
        events: {
          orderBy: { createdAt: 'desc' }
        },
        targetContact: {
          include: {
            discoveredSupplier: {
              include: {
                discoveredBrand: true
              }
            }
          }
        }
      }
    });

    if (!email) {
      console.log(`❌ [GROWTH] Email not found: ${emailId} for tenant: ${tenantId}`);
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'Email not found or you do not have permission to access it.'
      });
    }

    // Calculate engagement statistics
    const stats = {
      emailId: email.id,
      subject: email.subject,
      status: email.status,
      sentAt: email.sentAt,
      targetContact: {
        name: email.targetContact.name,
        email: email.targetContact.email,
        company: email.targetContact.discoveredSupplier.companyName
      },
      engagement: {
        totalEvents: email.events.length,
        openCount: email.events.filter(e => e.type === 'OPENED').length,
        clickCount: email.events.filter(e => e.type === 'CLICKED').length,
        firstOpened: email.events.find(e => e.type === 'OPENED')?.createdAt || null,
        firstClicked: email.events.find(e => e.type === 'CLICKED')?.createdAt || null,
        lastActivity: email.events.length > 0 ? email.events[0].createdAt : null
      },
      events: email.events.map(event => ({
        id: event.id,
        type: event.type,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        createdAt: event.createdAt
      }))
    };

    console.log(`✅ [GROWTH] Engagement stats retrieved for email: ${emailId}`, {
      totalEvents: stats.engagement.totalEvents,
      openCount: stats.engagement.openCount,
      clickCount: stats.engagement.clickCount
    });
    console.log('✅ [GROWTH] === GET EMAIL ENGAGEMENT STATS SUCCESS ===');
    
    res.status(200).json(stats);

  } catch (error) {
    console.error('❌ [GROWTH] === GET EMAIL ENGAGEMENT STATS ERROR ===');
    console.error(`❌ [GROWTH] Error fetching engagement stats for email ${req.params.emailId}:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch email engagement statistics',
      details: error.message 
    });
  }
};

/**
 * 📊 CAMPAIGN ANALYTICS: Get comprehensive campaign performance analytics
 * Called by frontend analytics dashboard.
 * Uses JWT authentication.
 */
exports.getCampaignAnalytics = async (req, res) => {
  console.log('📊 [GROWTH] === GET CAMPAIGN ANALYTICS REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📊 [GROWTH] Fetching campaign analytics for tenant: ${tenantId}`);

    // Get all campaigns with detailed analytics
    const campaigns = await prisma.growthCampaign.findMany({
      where: { tenantId: tenantId },
      include: {
        discoveredBrands: {
          include: {
            discoveredSuppliers: {
              include: {
                targetContacts: {
                  include: {
                    outreachEmails: {
                      include: {
                        events: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate analytics for each campaign
    const campaignAnalytics = campaigns.map(campaign => {
      const brands = campaign.discoveredBrands || [];
      const suppliers = brands.flatMap(b => b.discoveredSuppliers || []);
      const contacts = suppliers.flatMap(s => s.targetContacts || []);
      const emails = contacts.flatMap(c => c.outreachEmails || []);
      const events = emails.flatMap(e => e.events || []);

      // Email status counts
      const sentEmails = emails.filter(e => e.status === 'SENT');
      const repliedEmails = emails.filter(e => e.status === 'REPLIED');
      const failedEmails = emails.filter(e => e.status === 'FAILED');
      const queuedEmails = emails.filter(e => e.status === 'QUEUED');

      // Engagement metrics
      const openEvents = events.filter(e => e.type === 'OPENED');
      const clickEvents = events.filter(e => e.type === 'CLICKED');
      const uniqueOpens = [...new Set(openEvents.map(e => e.outreachEmailId))].length;
      const uniqueClicks = [...new Set(clickEvents.map(e => e.outreachEmailId))].length;

      // Contact status counts
      const activeContacts = contacts.filter(c => c.status === 'ACTIVE');
      const suppressedContacts = contacts.filter(c => c.status === 'DO_NOT_CONTACT');

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignStatus: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        keywords: campaign.keywords,
        metrics: {
          // Discovery metrics
          brandsDiscovered: brands.length,
          suppliersIdentified: suppliers.length,
          contactsEnriched: contacts.length,
          
          // Email metrics
          totalEmails: emails.length,
          emailsSent: sentEmails.length,
          emailsReplied: repliedEmails.length,
          emailsFailed: failedEmails.length,
          emailsQueued: queuedEmails.length,
          
          // Engagement metrics
          totalOpens: openEvents.length,
          totalClicks: clickEvents.length,
          uniqueOpens: uniqueOpens,
          uniqueClicks: uniqueClicks,
          
          // Contact metrics
          activeContacts: activeContacts.length,
          suppressedContacts: suppressedContacts.length,
          
          // Rate calculations (avoid division by zero)
          openRate: sentEmails.length > 0 ? (uniqueOpens / sentEmails.length * 100).toFixed(2) : '0.00',
          clickRate: sentEmails.length > 0 ? (uniqueClicks / sentEmails.length * 100).toFixed(2) : '0.00',
          replyRate: sentEmails.length > 0 ? (repliedEmails.length / sentEmails.length * 100).toFixed(2) : '0.00',
          bounceRate: sentEmails.length > 0 ? (failedEmails.length / sentEmails.length * 100).toFixed(2) : '0.00'
        }
      };
    });

    // Calculate overall totals
    const totals = campaignAnalytics.reduce((acc, campaign) => {
      acc.totalCampaigns += 1;
      acc.totalBrands += campaign.metrics.brandsDiscovered;
      acc.totalSuppliers += campaign.metrics.suppliersIdentified;
      acc.totalContacts += campaign.metrics.contactsEnriched;
      acc.totalEmails += campaign.metrics.totalEmails;
      acc.totalSent += campaign.metrics.emailsSent;
      acc.totalReplies += campaign.metrics.emailsReplied;
      acc.totalOpens += campaign.metrics.uniqueOpens;
      acc.totalClicks += campaign.metrics.uniqueClicks;
      acc.totalFailed += campaign.metrics.emailsFailed;
      acc.activeContacts += campaign.metrics.activeContacts;
      acc.suppressedContacts += campaign.metrics.suppressedContacts;
      return acc;
    }, {
      totalCampaigns: 0,
      totalBrands: 0,
      totalSuppliers: 0,
      totalContacts: 0,
      totalEmails: 0,
      totalSent: 0,
      totalReplies: 0,
      totalOpens: 0,
      totalClicks: 0,
      totalFailed: 0,
      activeContacts: 0,
      suppressedContacts: 0
    });

    // Calculate overall rates
    const overallRates = {
      overallOpenRate: totals.totalSent > 0 ? (totals.totalOpens / totals.totalSent * 100).toFixed(2) : '0.00',
      overallClickRate: totals.totalSent > 0 ? (totals.totalClicks / totals.totalSent * 100).toFixed(2) : '0.00',
      overallReplyRate: totals.totalSent > 0 ? (totals.totalReplies / totals.totalSent * 100).toFixed(2) : '0.00',
      overallBounceRate: totals.totalSent > 0 ? (totals.totalFailed / totals.totalSent * 100).toFixed(2) : '0.00'
    };

    const analytics = {
      tenantId: tenantId,
      generatedAt: new Date().toISOString(),
      overview: {
        ...totals,
        ...overallRates
      },
      campaigns: campaignAnalytics
    };

    console.log(`✅ [GROWTH] Campaign analytics retrieved for tenant: ${tenantId}`, {
      totalCampaigns: totals.totalCampaigns,
      totalContacts: totals.totalContacts,
      totalEmails: totals.totalEmails,
      overallReplyRate: overallRates.overallReplyRate + '%'
    });
    console.log('✅ [GROWTH] === GET CAMPAIGN ANALYTICS SUCCESS ===');
    
    res.status(200).json(analytics);

  } catch (error) {
    console.error('❌ [GROWTH] === GET CAMPAIGN ANALYTICS ERROR ===');
    console.error(`❌ [GROWTH] Error fetching campaign analytics:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch campaign analytics',
      details: error.message 
    });
  }
};

/**
 * 📈 GROWTH METRICS: Get growth metrics and time-series data
 * Called by frontend analytics dashboard.
 * Uses JWT authentication.
 */
exports.getGrowthMetrics = async (req, res) => {
  console.log('📈 [GROWTH] === GET GROWTH METRICS REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    const { timeframe = '30d' } = req.query; // 7d, 30d, 90d, 1y
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📈 [GROWTH] Fetching growth metrics for tenant: ${tenantId}, timeframe: ${timeframe}`);

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get time-series data for campaigns
    const campaignTimeSeries = await prisma.growthCampaign.findMany({
      where: { 
        tenantId: tenantId,
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Get time-series data for contacts
    const contactTimeSeries = await prisma.targetContact.findMany({
      where: {
        discoveredSupplier: {
          discoveredBrand: {
            campaign: {
              tenantId: tenantId
            }
          }
        },
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        discoveredSupplier: {
          select: {
            companyName: true,
            discoveredBrand: {
              select: {
                campaign: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Get time-series data for emails
    const emailTimeSeries = await prisma.outreachEmail.findMany({
      where: {
        targetContact: {
          discoveredSupplier: {
            discoveredBrand: {
              campaign: {
                tenantId: tenantId
              }
            }
          }
        },
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        status: true,
        subject: true,
        createdAt: true,
        sentAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Generate daily aggregations
    const getDailyData = (data, dateField = 'createdAt') => {
      const dailyData = {};
      
      data.forEach(item => {
        const date = new Date(item[dateField]).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = 0;
        }
        dailyData[date]++;
      });

      // Fill missing dates with 0
      const current = new Date(startDate);
      while (current <= now) {
        const dateStr = current.toISOString().split('T')[0];
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = 0;
        }
        current.setDate(current.getDate() + 1);
      }

      return Object.keys(dailyData)
        .sort()
        .map(date => ({
          date,
          count: dailyData[date]
        }));
    };

    const growthMetrics = {
      tenantId: tenantId,
      timeframe: timeframe,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      generatedAt: now.toISOString(),
      
      timeSeries: {
        campaigns: getDailyData(campaignTimeSeries),
        contacts: getDailyData(contactTimeSeries),
        emails: getDailyData(emailTimeSeries),
        emailsSent: getDailyData(emailTimeSeries.filter(e => e.sentAt), 'sentAt')
      },
      
      summary: {
        campaignsCreated: campaignTimeSeries.length,
        contactsAcquired: contactTimeSeries.length,
        emailsGenerated: emailTimeSeries.length,
        emailsSent: emailTimeSeries.filter(e => e.sentAt).length,
        
        // Status breakdowns
        campaignsByStatus: campaignTimeSeries.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {}),
        
        contactsByStatus: contactTimeSeries.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {}),
        
        emailsByStatus: emailTimeSeries.reduce((acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        }, {})
      }
    };

    console.log(`✅ [GROWTH] Growth metrics retrieved for tenant: ${tenantId}`, {
      timeframe: timeframe,
      campaignsCreated: growthMetrics.summary.campaignsCreated,
      contactsAcquired: growthMetrics.summary.contactsAcquired,
      emailsGenerated: growthMetrics.summary.emailsGenerated
    });
    console.log('✅ [GROWTH] === GET GROWTH METRICS SUCCESS ===');
    
    res.status(200).json(growthMetrics);

  } catch (error) {
    console.error('❌ [GROWTH] === GET GROWTH METRICS ERROR ===');
    console.error(`❌ [GROWTH] Error fetching growth metrics:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch growth metrics',
      details: error.message 
    });
  }
};

/**
 * 📊 ANALYTICS DASHBOARD: Get comprehensive analytics dashboard data
 * Called by frontend analytics dashboard.
 * Uses JWT authentication.
 */
exports.getAnalyticsDashboard = async (req, res) => {
  console.log('📊 [GROWTH] === GET ANALYTICS DASHBOARD REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    const { timeframe = '30d' } = req.query;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📊 [GROWTH] Fetching analytics dashboard for tenant: ${tenantId}, timeframe: ${timeframe}`);

    // Calculate date range for recent activity
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get comprehensive data
    const [campaigns, contacts, emails, events, followUpTasks] = await Promise.all([
      // Campaigns
      prisma.growthCampaign.findMany({
        where: { tenantId: tenantId },
        include: {
          discoveredBrands: {
            include: {
              discoveredSuppliers: {
                include: {
                  targetContacts: true
                }
              }
            }
          }
        }
      }),
      
      // Contacts
      prisma.targetContact.findMany({
        where: {
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
      }),
      
      // Emails
      prisma.outreachEmail.findMany({
        where: {
          targetContact: {
            discoveredSupplier: {
              discoveredBrand: {
                campaign: {
                  tenantId: tenantId
                }
              }
            }
          }
        },
        include: {
          targetContact: {
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
          }
        }
      }),
      
      // Events
      prisma.outreachEmailEvent.findMany({
        where: {
          outreachEmail: {
            targetContact: {
              discoveredSupplier: {
                discoveredBrand: {
                  campaign: {
                    tenantId: tenantId
                  }
                }
              }
            }
          }
        },
        include: {
          outreachEmail: true
        }
      }),
      
      // Follow-up tasks
      prisma.followUpTask.findMany({
        where: { tenantId: tenantId },
        include: {
          relatedContact: true,
          relatedEmail: true
        }
      })
    ]);

    // Calculate key metrics
    const totalCampaigns = campaigns.length;
    const totalBrands = campaigns.reduce((sum, c) => sum + (c.discoveredBrands?.length || 0), 0);
    const totalSuppliers = campaigns.reduce((sum, c) => 
      sum + c.discoveredBrands.reduce((brandSum, b) => brandSum + (b.discoveredSuppliers?.length || 0), 0), 0);
    const totalContacts = contacts.length;
    const totalEmails = emails.length;
    const totalEvents = events.length;

    // Email status breakdown
    const emailStatusBreakdown = emails.reduce((acc, email) => {
      acc[email.status] = (acc[email.status] || 0) + 1;
      return acc;
    }, {});

    // Contact status breakdown
    const contactStatusBreakdown = contacts.reduce((acc, contact) => {
      acc[contact.status] = (acc[contact.status] || 0) + 1;
      return acc;
    }, {});

    // Event type breakdown
    const eventTypeBreakdown = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    // Calculate engagement rates
    const sentEmails = emailStatusBreakdown.SENT || 0;
    const repliedEmails = emailStatusBreakdown.REPLIED || 0;
    const failedEmails = emailStatusBreakdown.FAILED || 0;
    const openEvents = eventTypeBreakdown.OPENED || 0;
    const clickEvents = eventTypeBreakdown.CLICKED || 0;

    // Recent activity (last 30 days)
    const recentActivityFilter = (item) => new Date(item.createdAt) >= startDate;
    const recentCampaigns = campaigns.filter(recentActivityFilter);
    const recentContacts = contacts.filter(recentActivityFilter);
    const recentEmails = emails.filter(recentActivityFilter);
    const recentEvents = events.filter(recentActivityFilter);

    // Top performing campaigns
    const campaignPerformance = campaigns.map(campaign => {
      const campaignBrands = campaign.discoveredBrands || [];
      const campaignSuppliers = campaignBrands.flatMap(b => b.discoveredSuppliers || []);
      const campaignContacts = campaignSuppliers.flatMap(s => s.targetContacts || []);
      const campaignEmails = emails.filter(e => 
        e.targetContact.discoveredSupplier.discoveredBrand.campaign.id === campaign.id
      );
      const campaignEmailEvents = events.filter(e => 
        campaignEmails.some(email => email.id === e.outreachEmailId)
      );

      const sentCount = campaignEmails.filter(e => e.status === 'SENT').length;
      const repliedCount = campaignEmails.filter(e => e.status === 'REPLIED').length;
      
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        contactsEnriched: campaignContacts.length,
        emailsSent: sentCount,
        emailsReplied: repliedCount,
        replyRate: sentCount > 0 ? ((repliedCount / sentCount) * 100).toFixed(2) : '0.00',
        totalEngagement: campaignEmailEvents.length,
        createdAt: campaign.createdAt
      };
    }).sort((a, b) => parseFloat(b.replyRate) - parseFloat(a.replyRate));

    // Follow-up task breakdown
    const taskStatusBreakdown = followUpTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const dashboard = {
      tenantId: tenantId,
      timeframe: timeframe,
      generatedAt: now.toISOString(),
      
      // Key metrics
      overview: {
        totalCampaigns,
        totalBrands,
        totalSuppliers,
        totalContacts,
        totalEmails,
        totalEvents,
        activeContacts: contactStatusBreakdown.ACTIVE || 0,
        suppressedContacts: contactStatusBreakdown.DO_NOT_CONTACT || 0,
        pendingTasks: taskStatusBreakdown.TODO || 0
      },
      
      // Performance metrics
      performance: {
        emailsSent: sentEmails,
        emailsReplied: repliedEmails,
        emailsFailed: failedEmails,
        emailsQueued: emailStatusBreakdown.QUEUED || 0,
        emailsDraft: emailStatusBreakdown.DRAFT || 0,
        
        // Engagement
        totalOpens: openEvents,
        totalClicks: clickEvents,
        uniqueOpens: events.filter(e => e.type === 'OPENED').map(e => e.outreachEmailId).filter((v, i, a) => a.indexOf(v) === i).length,
        uniqueClicks: events.filter(e => e.type === 'CLICKED').map(e => e.outreachEmailId).filter((v, i, a) => a.indexOf(v) === i).length,
        
        // Rates
        openRate: sentEmails > 0 ? ((openEvents / sentEmails) * 100).toFixed(2) : '0.00',
        clickRate: sentEmails > 0 ? ((clickEvents / sentEmails) * 100).toFixed(2) : '0.00',
        replyRate: sentEmails > 0 ? ((repliedEmails / sentEmails) * 100).toFixed(2) : '0.00',
        bounceRate: sentEmails > 0 ? ((failedEmails / sentEmails) * 100).toFixed(2) : '0.00'
      },
      
      // Recent activity
      recentActivity: {
        campaignsCreated: recentCampaigns.length,
        contactsAcquired: recentContacts.length,
        emailsGenerated: recentEmails.length,
        engagementEvents: recentEvents.length
      },
      
      // Top performing campaigns
      topCampaigns: campaignPerformance.slice(0, 5),
      
      // Breakdown data
      breakdowns: {
        emailStatus: emailStatusBreakdown,
        contactStatus: contactStatusBreakdown,
        eventTypes: eventTypeBreakdown,
        taskStatus: taskStatusBreakdown,
        campaignStatus: campaigns.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {})
      }
    };

    console.log(`✅ [GROWTH] Analytics dashboard retrieved for tenant: ${tenantId}`, {
      totalCampaigns: dashboard.overview.totalCampaigns,
      totalContacts: dashboard.overview.totalContacts,
      totalEmails: dashboard.overview.totalEmails,
      replyRate: dashboard.performance.replyRate + '%'
    });
    console.log('✅ [GROWTH] === GET ANALYTICS DASHBOARD SUCCESS ===');
    
    res.status(200).json(dashboard);

  } catch (error) {
    console.error('❌ [GROWTH] === GET ANALYTICS DASHBOARD ERROR ===');
    console.error(`❌ [GROWTH] Error fetching analytics dashboard:`, error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch analytics dashboard',
      details: error.message 
    });
  }
};



/**
 * 🔍 FIND CONTACT BY EMAIL: Find a contact by email address for n8n workflows
 * Called by n8n workflows to look up contacts before processing.
 * Uses API key authentication.
 */
exports.findContactByEmail = async (req, res) => {
  console.log('🔍 [GROWTH] === FIND CONTACT BY EMAIL REQUEST ===');
  
  try {
    const { email, tenantId } = req.query;
    
    console.log('🔍 [GROWTH] Contact search request:', {
      email: email,
      tenantId: tenantId,
      hasEmail: !!email,
      hasTenantId: !!tenantId
    });

    if (!email) {
      console.log('❌ [GROWTH] Missing required parameter: email');
      return res.status(400).json({ 
        error: 'Missing required parameter',
        message: 'email query parameter is required.' 
      });
    }

    // If tenantId is provided, use it for filtering. Otherwise, find contact across all tenants
    const whereCondition = tenantId ? {
      email: email,
      discoveredSupplier: {
        discoveredBrand: {
          campaign: {
            tenantId: tenantId
          }
        }
      }
    } : {
      email: email
    };

    // Find the contact in our database
    const contact = await prisma.targetContact.findFirst({
      where: whereCondition,
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

    const foundTenantId = contact?.discoveredSupplier?.discoveredBrand?.campaign?.tenantId;
    
    console.log('🔍 [GROWTH] Contact search result:', {
      found: !!contact,
      contactId: contact?.id,
      contactName: contact?.name,
      companyName: contact?.discoveredSupplier?.companyName,
      campaignName: contact?.discoveredSupplier?.discoveredBrand?.campaign?.name,
      foundTenantId: foundTenantId
    });

    if (!contact) {
      console.log('🔍 [GROWTH] Contact not found');
      return res.status(404).json({ 
        message: 'Contact not found',
        email: email,
        searchedWithTenantId: tenantId || 'none (searched all tenants)'
      });
    }

    // Return contact details with tenantId from the relationship chain
    const responseData = {
      message: 'Contact found successfully',
      tenantId: foundTenantId, // Include tenantId at top level for easy access
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        title: contact.title,
        linkedinUrl: contact.linkedinUrl,
        supplier: {
          id: contact.discoveredSupplier.id,
          companyName: contact.discoveredSupplier.companyName,
          country: contact.discoveredSupplier.country,
          specialization: contact.discoveredSupplier.specialization
        },
        brand: {
          id: contact.discoveredSupplier.discoveredBrand.id,
          companyName: contact.discoveredSupplier.discoveredBrand.companyName,
          website: contact.discoveredSupplier.discoveredBrand.website
        },
        campaign: {
          id: contact.discoveredSupplier.discoveredBrand.campaign.id,
          name: contact.discoveredSupplier.discoveredBrand.campaign.name,
          keywords: contact.discoveredSupplier.discoveredBrand.campaign.keywords,
          tenantId: foundTenantId
        }
      }
    };

    console.log('✅ [GROWTH] Contact found and returned successfully');
    console.log('✅ [GROWTH] === FIND CONTACT BY EMAIL SUCCESS ===');
    
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ [GROWTH] === FIND CONTACT BY EMAIL ERROR ===');
    console.error('❌ [GROWTH] Error finding contact by email:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to find contact',
      message: 'Internal server error while searching for contact.',
      details: error.message 
    });
  }
};

/**
 * 📬 CREATE TASK FROM REPLY: Create a follow-up task when a reply is detected by n8n
 * Called by n8n ReplyProcessor workflow when a reply is detected in the inbox.
 * Uses API key authentication.
 */
exports.createTaskFromReply = async (req, res) => {
  console.log('📬 [GROWTH] === CREATE TASK FROM REPLY REQUEST ===');
  
  try {
    const { senderEmail, subject, tenantId, replyBody } = req.body;
    
    console.log('📬 [GROWTH] Reply detection request:', {
      senderEmail: senderEmail,
      subject: subject,
      tenantId: tenantId,
      hasReplyBody: !!replyBody
    });

    if (!senderEmail || !subject || !tenantId) {
      console.log('❌ [GROWTH] Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'senderEmail, subject, and tenantId are required.' 
      });
    }

    // Find the contact in our database who sent the email
    const contact = await prisma.targetContact.findFirst({
      where: {
        email: senderEmail,
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

    console.log('📬 [GROWTH] Contact search result:', {
      found: !!contact,
      contactId: contact?.id,
      contactName: contact?.name,
      companyName: contact?.discoveredSupplier?.companyName
    });

    // If the sender is not a known contact, we ignore it
    if (!contact) {
      console.log('📬 [GROWTH] Sender is not a tracked contact, ignoring reply');
      return res.status(200).json({ 
        message: 'Sender is not a tracked contact, task not created.',
        senderEmail: senderEmail,
        action: 'ignored'
      });
    }

    // Find the last email we sent to this contact to link it to the task
    const lastSentEmail = await prisma.outreachEmail.findFirst({
      where: { 
        targetContactId: contact.id, 
        status: 'SENT' 
      },
      orderBy: { sentAt: 'desc' }
    });

    console.log('📬 [GROWTH] Last sent email:', {
      found: !!lastSentEmail,
      emailId: lastSentEmail?.id,
      subject: lastSentEmail?.subject,
      sentAt: lastSentEmail?.sentAt
    });

    // Create the high-priority follow-up task
    const taskNotes = `CUSTOMER REPLY:\n${replyBody || 'No reply text captured'}\n\n` +
      `--- CONTEXT ---\n` +
      `Regarding email with subject: "${lastSentEmail?.subject || subject}"\n\n` +
      `Contact: ${contact.name} (${contact.email})\n` +
      `Company: ${contact.discoveredSupplier.companyName}\n` +
      `Campaign: ${contact.discoveredSupplier.discoveredBrand.campaign.name}`;

    const followUpTask = await prisma.followUpTask.create({
      data: {
        tenantId: tenantId,
        title: `Reply received from: ${contact.name}`,
        notes: taskNotes,
        priority: 'HIGH',
        status: 'TODO',
        relatedContactId: contact.id,
        relatedEmailId: lastSentEmail?.id // Link to the original email if found
      }
    });

    console.log('📬 [GROWTH] Follow-up task created:', {
      taskId: followUpTask.id,
      title: followUpTask.title,
      priority: followUpTask.priority
    });
    
    // Finally, update the status of the original email to REPLIED
    if (lastSentEmail) {
      await prisma.outreachEmail.update({
        where: { id: lastSentEmail.id },
        data: { status: 'REPLIED' }
      });
      
      console.log('📬 [GROWTH] Email status updated to REPLIED:', {
        emailId: lastSentEmail.id,
        newStatus: 'REPLIED'
      });
    }

    console.log('✅ [GROWTH] Reply processing completed successfully');
    console.log('✅ [GROWTH] === CREATE TASK FROM REPLY SUCCESS ===');

    res.status(201).json({ 
      message: 'Follow-up task created successfully.',
      task: {
        id: followUpTask.id,
        title: followUpTask.title,
        priority: followUpTask.priority,
        contactName: contact.name,
        companyName: contact.discoveredSupplier.companyName
      },
      emailUpdated: !!lastSentEmail,
      originalEmailId: lastSentEmail?.id
    });

  } catch (error) {
    console.error('❌ [GROWTH] === CREATE TASK FROM REPLY ERROR ===');
    console.error('❌ [GROWTH] Error creating task from reply:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create task',
      message: 'Internal server error while processing reply.',
      details: error.message 
    });
  }
};

/**
 * 📤 TRIGGER EMAIL SEND: Trigger n8n EmailSender workflow to send an approved email draft
 * Called by frontend when user clicks "Send" or "Approve & Send" button.
 * Uses JWT authentication.
 */
exports.triggerEmailSend = async (req, res) => {
  console.log('📤 [GROWTH] === TRIGGER EMAIL SEND REQUEST ===');
  
  try {
    const { emailId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
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

    console.log(`📤 [GROWTH] Triggering email send for draft: ${emailId}, tenant: ${tenantId}`);

    // First verify the email exists and belongs to the tenant
    const email = await prisma.outreachEmail.findFirst({
      where: { 
        id: emailId,
        targetContact: {
          discoveredSupplier: {
            discoveredBrand: {
              campaign: {
                tenantId: tenantId
              }
            }
          }
        }
      },
      include: {
        targetContact: {
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
        }
      }
    });

    if (!email) {
      console.log(`❌ [GROWTH] Email draft not found or unauthorized: ${emailId}`);
      return res.status(404).json({ 
        error: 'Email draft not found',
        message: 'Email draft not found or you do not have permission to send it.'
      });
    }

    if (email.status !== 'DRAFT') {
      console.log(`❌ [GROWTH] Email is not in DRAFT status: ${email.status}`);
      return res.status(400).json({ 
        error: 'Email cannot be sent',
        message: `Email is in ${email.status} status. Only DRAFT emails can be sent.`,
        currentStatus: email.status
      });
    }

    console.log(`✅ [GROWTH] Email draft found: ${email.subject}`);
    console.log(`✅ [GROWTH] Recipient: ${email.targetContact.name} <${email.targetContact.email}>`);

    // Get the n8n EmailSender webhook URL from environment variables
    const n8nEmailSenderUrl = process.env.N8N_EMAILSENDER_WEBHOOK_URL;
    console.log(`📤 [GROWTH] Environment check:`, {
      hasEmailSenderUrl: !!n8nEmailSenderUrl,
      urlPreview: n8nEmailSenderUrl ? n8nEmailSenderUrl.substring(0, 50) + '...' : 'None'
    });
    
    if (!n8nEmailSenderUrl) {
      console.error('❌ [GROWTH] N8N_EMAILSENDER_WEBHOOK_URL is not set');
      return res.status(500).json({ 
        message: 'Email sending service is not configured. Please contact support.' 
      });
    }

    // Update email status to QUEUED before triggering n8n
    await prisma.outreachEmail.update({
      where: { id: emailId },
      data: { status: 'QUEUED' }
    });

    console.log(`✅ [GROWTH] Updated email status to QUEUED: ${emailId}`);

    // Trigger the n8n EmailSender workflow
    console.log(`📡 [GROWTH] Preparing n8n EmailSender webhook call:`, {
      url: n8nEmailSenderUrl,
      emailId: emailId,
      subject: email.subject,
      recipient: email.targetContact.email
    });
    
    const n8nResponse = await axios.post(n8nEmailSenderUrl, {
      emailId: emailId,
      tenantId: tenantId
    }, {
      timeout: 100000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Texintelli-SPIMS/1.0'
      }
    });

    console.log(`✅ [GROWTH] n8n EmailSender webhook called successfully:`, {
      status: n8nResponse.status,
      statusText: n8nResponse.statusText,
      responseData: n8nResponse.data
    });

    // Respond to the frontend immediately to let it know the process has started
    const responseData = {
      message: 'Email sending process has been successfully initiated.',
      status: 'queued',
      emailId: emailId,
      subject: email.subject,
      recipient: email.targetContact.email,
      contactName: email.targetContact.name
    };
    
    console.log('✅ [GROWTH] Sending success response to frontend:', responseData);
    console.log('✅ [GROWTH] === TRIGGER EMAIL SEND SUCCESS ===');
    res.status(202).json(responseData);

  } catch (error) {
    console.error('❌ [GROWTH] === TRIGGER EMAIL SEND ERROR ===');
    console.error('❌ [GROWTH] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    console.error('❌ [GROWTH] Error stack:', error.stack);

    // If there was an error, revert the email status back to DRAFT
    try {
      await prisma.outreachEmail.update({
        where: { id: req.params.emailId },
        data: { status: 'DRAFT' }
      });
      console.log(`🔄 [GROWTH] Reverted email status back to DRAFT: ${req.params.emailId}`);
    } catch (revertError) {
      console.error('❌ [GROWTH] Failed to revert email status:', revertError);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        error: 'Email sending service unavailable',
        message: 'The email automation service is currently unavailable. Please try again later.'
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: 'Email sending timeout',
        message: 'The email sending request timed out. Please try again.'
      });
    }

    res.status(500).json({ 
      error: 'Failed to initiate email sending',
      details: error.message 
    });
  }
};

/**
 * 📧 RESEND EMAIL: Create a new draft copy of an existing email for resending
 * Called by frontend when user wants to resend a previously sent email.
 * Uses JWT authentication.
 */
exports.resendEmail = async (req, res) => {
  console.log('📧 [GROWTH] === RESEND EMAIL REQUEST ===');
  
  try {
    const { emailId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
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

    console.log(`📧 [GROWTH] Creating resend copy for email: ${emailId}, tenant: ${tenantId}`);

    // First verify the email exists and belongs to the tenant
    const originalEmail = await prisma.outreachEmail.findFirst({
      where: { 
        id: emailId,
        targetContact: {
          discoveredSupplier: {
            discoveredBrand: {
              campaign: {
                tenantId: tenantId
              }
            }
          }
        }
      },
      include: {
        targetContact: {
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
        }
      }
    });

    if (!originalEmail) {
      console.log(`❌ [GROWTH] Original email not found or unauthorized: ${emailId}`);
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'Email not found or you do not have permission to access it.'
      });
    }

    console.log(`✅ [GROWTH] Original email found: ${originalEmail.subject}`);
    console.log(`✅ [GROWTH] Contact: ${originalEmail.targetContact.name} <${originalEmail.targetContact.email}>`);

    // Create a new draft copy of the email
    const newDraft = await prisma.outreachEmail.create({
      data: {
        subject: `${originalEmail.subject} (Resend)`,
        body: originalEmail.body,
        status: 'DRAFT',
        targetContactId: originalEmail.targetContactId
      }
    });

    console.log(`✅ [GROWTH] Created new draft copy: ${newDraft.id}`);
    
    const responseData = {
      message: 'Email draft copy created successfully for resending',
      originalEmailId: emailId,
      newDraftId: newDraft.id,
      subject: newDraft.subject,
      contactName: originalEmail.targetContact.name,
      contactEmail: originalEmail.targetContact.email
    };
    
    console.log('✅ [GROWTH] Sending success response to frontend:', responseData);
    console.log('✅ [GROWTH] === RESEND EMAIL SUCCESS ===');
    res.status(201).json(responseData);

  } catch (error) {
    console.error('❌ [GROWTH] === RESEND EMAIL ERROR ===');
    console.error('❌ [GROWTH] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    console.error('❌ [GROWTH] Error stack:', error.stack);

    res.status(500).json({ 
      error: 'Failed to create resend copy',
      details: error.message 
    });
  }
}; 

// =====================================================
// TASK MANAGEMENT CRUD ENDPOINTS (Module 5)
// =====================================================

/**
 * 📋 GET TASKS: Get all tasks with optional filtering
 * Called by frontend task management components.
 * Uses JWT authentication.
 */
exports.getGrowthTasks = async (req, res) => {
  console.log('📋 [GROWTH] === GET GROWTH TASKS REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    const { 
      status, 
      priority, 
      taskType, 
      limit = 50, 
      offset = 0 
    } = req.query;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📋 [GROWTH] Fetching tasks for tenant: ${tenantId}`, {
      status, priority, taskType, limit, offset
    });

    // Build filter conditions
    const where = {
      tenantId: tenantId
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    // TaskType filtering: REPLY_FOLLOWUP = has relatedEmailId, GENERAL = no relatedEmailId
    if (taskType === 'REPLY_FOLLOWUP') {
      where.relatedEmailId = { not: null };
    } else if (taskType === 'GENERAL') {
      where.relatedEmailId = null;
    }

    // Get tasks with related data
    const [tasks, totalCount] = await Promise.all([
      prisma.followUpTask.findMany({
        where,
        include: {
          relatedContact: {
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
          },
          relatedEmail: true
        },
        orderBy: [
          { status: 'asc' }, // TODO first
          { priority: 'desc' }, // HIGH first
          { createdAt: 'desc' } // Newest first
        ],
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      
      prisma.followUpTask.count({ where })
    ]);

    // Transform tasks to match frontend interface
    const transformedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.notes || '',
      priority: task.priority,
      status: task.status,
      taskType: task.relatedEmailId ? 'REPLY_FOLLOWUP' : 'GENERAL',
      assignedUserId: null, // Not implemented yet
      dueDate: task.dueDate?.toISOString() || null,
      completedAt: task.status === 'DONE' ? task.updatedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      
      // Reply-specific context
      originalEmailId: task.relatedEmailId,
      contactId: task.relatedContactId,
      contactName: task.relatedContact?.name || null,
      contactEmail: task.relatedContact?.email || null,
      companyName: task.relatedContact?.discoveredSupplier?.companyName || null,
      campaignId: task.relatedContact?.discoveredSupplier?.discoveredBrand?.campaignId || null,
      campaignName: task.relatedContact?.discoveredSupplier?.discoveredBrand?.campaign?.name || null,
      replySubject: task.relatedEmail?.subject || null
    }));

    // Calculate counts
    const pendingCount = await prisma.followUpTask.count({
      where: { tenantId, status: 'TODO' }
    });

    const highPriorityCount = await prisma.followUpTask.count({
      where: { tenantId, status: 'TODO', priority: 'HIGH' }
    });

    console.log(`✅ [GROWTH] Found ${transformedTasks.length} tasks for tenant: ${tenantId}`);

    res.status(200).json({
      tasks: transformedTasks,
      totalCount,
      pendingCount,
      highPriorityCount
    });

  } catch (error) {
    console.error('❌ [GROWTH] Error fetching growth tasks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tasks',
      details: error.message 
    });
  }
};

/**
 * 📋 GET TASK BY ID: Get a specific task by ID
 * Called by frontend when viewing task details.
 * Uses JWT authentication.
 */
exports.getGrowthTask = async (req, res) => {
  console.log('📋 [GROWTH] === GET GROWTH TASK BY ID REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    const { taskId } = req.params;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📋 [GROWTH] Fetching task: ${taskId} for tenant: ${tenantId}`);

    const task = await prisma.followUpTask.findFirst({
      where: { 
        id: taskId,
        tenantId: tenantId 
      },
      include: {
        relatedContact: {
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
        },
        relatedEmail: true
      }
    });

    if (!task) {
      console.log(`❌ [GROWTH] Task not found: ${taskId} for tenant: ${tenantId}`);
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Task not found or you do not have permission to access it.'
      });
    }

    // Transform to match frontend interface
    const transformedTask = {
      id: task.id,
      title: task.title,
      description: task.notes || '',
      priority: task.priority,
      status: task.status,
      taskType: task.relatedEmailId ? 'REPLY_FOLLOWUP' : 'GENERAL',
      assignedUserId: null,
      dueDate: task.dueDate?.toISOString() || null,
      completedAt: task.status === 'DONE' ? task.updatedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      
      // Reply-specific context
      originalEmailId: task.relatedEmailId,
      contactId: task.relatedContactId,
      contactName: task.relatedContact?.name || null,
      contactEmail: task.relatedContact?.email || null,
      companyName: task.relatedContact?.discoveredSupplier?.companyName || null,
      campaignId: task.relatedContact?.discoveredSupplier?.discoveredBrand?.campaignId || null,
      campaignName: task.relatedContact?.discoveredSupplier?.discoveredBrand?.campaign?.name || null,
      replySubject: task.relatedEmail?.subject || null
    };

    console.log(`✅ [GROWTH] Task retrieved: ${taskId}`);
    res.status(200).json(transformedTask);

  } catch (error) {
    console.error('❌ [GROWTH] Error fetching growth task:', error);
    res.status(500).json({ 
      error: 'Failed to fetch task',
      details: error.message 
    });
  }
};

/**
 * 📋 CREATE TASK: Create a new growth task
 * Called by frontend when creating manual tasks.
 * Uses JWT authentication.
 */
exports.createGrowthTask = async (req, res) => {
  console.log('📋 [GROWTH] === CREATE GROWTH TASK REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    const { 
      title, 
      description, 
      priority = 'MEDIUM',
      taskType = 'GENERAL',
      dueDate,
      contactId 
    } = req.body;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (!title) {
      console.log('❌ [GROWTH] Missing required field: title');
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'title is required.' 
      });
    }

    console.log(`📋 [GROWTH] Creating task for tenant: ${tenantId}`, {
      title, priority, taskType, dueDate, contactId
    });

    // Create task data
    const taskData = {
      tenantId: tenantId,
      title: title,
      notes: description || null,
      priority: priority,
      status: 'TODO',
      dueDate: dueDate ? new Date(dueDate) : null,
      relatedContactId: contactId || null
    };

    const newTask = await prisma.followUpTask.create({
      data: taskData,
      include: {
        relatedContact: {
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
        }
      }
    });

    // Transform to match frontend interface
    const transformedTask = {
      id: newTask.id,
      title: newTask.title,
      description: newTask.notes || '',
      priority: newTask.priority,
      status: newTask.status,
      taskType: newTask.relatedEmailId ? 'REPLY_FOLLOWUP' : 'GENERAL',
      assignedUserId: null,
      dueDate: newTask.dueDate?.toISOString() || null,
      completedAt: null,
      createdAt: newTask.createdAt.toISOString(),
      updatedAt: newTask.updatedAt.toISOString(),
      
      // Contact context if available
      contactId: newTask.relatedContactId,
      contactName: newTask.relatedContact?.name || null,
      contactEmail: newTask.relatedContact?.email || null,
      companyName: newTask.relatedContact?.discoveredSupplier?.companyName || null,
      campaignId: newTask.relatedContact?.discoveredSupplier?.discoveredBrand?.campaignId || null,
      campaignName: newTask.relatedContact?.discoveredSupplier?.discoveredBrand?.campaign?.name || null
    };

    console.log(`✅ [GROWTH] Task created: ${newTask.id}`);
    res.status(201).json(transformedTask);

  } catch (error) {
    console.error('❌ [GROWTH] Error creating growth task:', error);
    res.status(500).json({ 
      error: 'Failed to create task',
      details: error.message 
    });
  }
};

/**
 * 📋 UPDATE TASK: Update an existing growth task
 * Called by frontend when editing tasks.
 * Uses JWT authentication.
 */
exports.updateGrowthTask = async (req, res) => {
  console.log('📋 [GROWTH] === UPDATE GROWTH TASK REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    const { taskId } = req.params;
    const { 
      title, 
      description, 
      priority, 
      status, 
      dueDate 
    } = req.body;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📋 [GROWTH] Updating task: ${taskId} for tenant: ${tenantId}`, {
      title, priority, status, dueDate
    });

    // Build update data (only include provided fields)
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.notes = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const updatedTask = await prisma.followUpTask.update({
      where: { 
        id: taskId,
        tenantId: tenantId // Ensure tenant ownership
      },
      data: updateData,
      include: {
        relatedContact: {
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
        },
        relatedEmail: true
      }
    });

    // Transform to match frontend interface
    const transformedTask = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.notes || '',
      priority: updatedTask.priority,
      status: updatedTask.status,
      taskType: updatedTask.relatedEmailId ? 'REPLY_FOLLOWUP' : 'GENERAL',
      assignedUserId: null,
      dueDate: updatedTask.dueDate?.toISOString() || null,
      completedAt: updatedTask.status === 'DONE' ? updatedTask.updatedAt.toISOString() : null,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
      
      // Reply-specific context
      originalEmailId: updatedTask.relatedEmailId,
      contactId: updatedTask.relatedContactId,
      contactName: updatedTask.relatedContact?.name || null,
      contactEmail: updatedTask.relatedContact?.email || null,
      companyName: updatedTask.relatedContact?.discoveredSupplier?.companyName || null,
      campaignId: updatedTask.relatedContact?.discoveredSupplier?.discoveredBrand?.campaignId || null,
      campaignName: updatedTask.relatedContact?.discoveredSupplier?.discoveredBrand?.campaign?.name || null,
      replySubject: updatedTask.relatedEmail?.subject || null
    };

    console.log(`✅ [GROWTH] Task updated: ${taskId}`);
    res.status(200).json(transformedTask);

  } catch (error) {
    if (error.code === 'P2025') {
      console.log(`❌ [GROWTH] Task not found: ${req.params.taskId}`);
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Task not found or you do not have permission to update it.'
      });
    }
    
    console.error('❌ [GROWTH] Error updating growth task:', error);
    res.status(500).json({ 
      error: 'Failed to update task',
      details: error.message 
    });
  }
};

/**
 * 📋 DELETE TASK: Delete a growth task
 * Called by frontend when deleting tasks.
 * Uses JWT authentication.
 */
exports.deleteGrowthTask = async (req, res) => {
  console.log('📋 [GROWTH] === DELETE GROWTH TASK REQUEST ===');
  
  try {
    const tenantId = req.user?.tenantId;
    const { taskId } = req.params;
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    console.log(`📋 [GROWTH] Deleting task: ${taskId} for tenant: ${tenantId}`);

    await prisma.followUpTask.delete({
      where: { 
        id: taskId,
        tenantId: tenantId // Ensure tenant ownership
      }
    });

    console.log(`✅ [GROWTH] Task deleted: ${taskId}`);
    res.status(200).json({ 
      message: 'Task deleted successfully',
      taskId: taskId
    });

  } catch (error) {
    if (error.code === 'P2025') {
      console.log(`❌ [GROWTH] Task not found: ${req.params.taskId}`);
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Task not found or you do not have permission to delete it.'
      });
    }
    
    console.error('❌ [GROWTH] Error deleting growth task:', error);
    res.status(500).json({ 
      error: 'Failed to delete task',
      details: error.message 
    });
  }
};

/**
 * 🚀 GENERATE AI REPLY (ASYNC): Trigger AI-powered reply draft generation
 * This endpoint triggers an n8n workflow asynchronously and returns immediately.
 * The n8n workflow will call back when the draft is ready.
 */
exports.generateAIReply = async (req, res) => {
  console.log('🚀 [GROWTH] === ASYNC AI REPLY GENERATION REQUEST ===');
  
  try {
    const { taskId } = req.params;
    const tenantId = req.user.tenantId;

    console.log('🚀 [GROWTH] Async AI reply generation request:', {
      taskId: taskId,
      tenantId: tenantId
    });

    // Fetch the task with all related data
    const task = await prisma.followUpTask.findFirst({
      where: { 
        id: taskId,
        tenantId: tenantId
      },
      include: {
        relatedContact: {
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
        },
        relatedEmail: true
      }
    });

    if (!task) {
      console.log(`❌ [GROWTH] Task not found: ${taskId}`);
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Task not found or you do not have permission to access it.'
      });
    }

    // Verify this is a reply follow-up task
    if (task.relatedEmailId === null) {
      console.log(`❌ [GROWTH] Not a reply task: ${taskId}`);
      return res.status(400).json({ 
        error: 'Invalid task type',
        message: 'AI reply generation is only available for reply follow-up tasks.'
      });
    }

    // Fetch company persona separately (it's related to tenant, not campaign)
    let companyPersona = null;
    try {
      companyPersona = await prisma.companyPersona.findUnique({
        where: { tenantId: tenantId }
      });
    } catch (error) {
      console.log('ℹ️ [GROWTH] No company persona found for tenant:', tenantId);
    }

    // Extract the customer's reply text from the task notes
    const replyText = task.notes?.split('CUSTOMER REPLY:\n')[1]?.split('\n\n--- CONTEXT ---')[0]?.trim() || 'No reply text available';
    
    console.log('🚀 [GROWTH] Extracted reply text:', {
      hasReplyText: !!replyText,
      replyLength: replyText.length
    });

    // Prepare the context bundle for n8n
    const contextBundle = {
      taskId: task.id,
      contactId: task.relatedContact?.id,
      contactName: task.relatedContact?.name || 'Unknown Contact',
      contactEmail: task.relatedContact?.email || '',
      companyName: task.relatedContact?.discoveredSupplier?.companyName || 'Unknown Company',
      campaignName: task.relatedContact?.discoveredSupplier?.discoveredBrand?.campaign?.name || 'Unknown Campaign',
      
      // Original email context
      originalEmail: {
        id: task.relatedEmailId,
        subject: task.relatedEmail?.subject || 'Unknown Subject',
        body: task.relatedEmail?.body || 'Original email body not available'
      },
      
      // Customer's reply
      replyText: replyText,
      
      // Company persona for context
      companyPersona: {
        id: companyPersona?.id || null,
        summary: companyPersona?.executiveSummary || 'Company persona not available'
      },

      // Callback URL for n8n to return the result
      callbackUrl: `${process.env.BACKEND_BASE_URL || 'https://dhya-spims-backend-prod.onrender.com'}/api/growth/ai-reply-callback`
    };

    console.log('🚀 [GROWTH] Prepared context bundle:', {
      hasOriginalEmail: !!contextBundle.originalEmail.body,
      hasReplyText: !!contextBundle.replyText,
      hasPersona: !!companyPersona,
      contactName: contextBundle.contactName,
      callbackUrl: contextBundle.callbackUrl
    });

    // Trigger the n8n ReplyDrafter workflow (fire-and-forget)
    const n8nWebhookUrl = process.env.N8N_REPLY_DRAFTER_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.log('❌ [GROWTH] N8N_REPLY_DRAFTER_WEBHOOK_URL not configured');
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'AI reply generation is not configured. Please contact your administrator.'
      });
    }

    console.log('🚀 [GROWTH] Triggering async n8n ReplyDrafter workflow...');

    // Fire-and-forget the webhook call (no await, no timeout)
    const axios = require('axios');
    axios.post(n8nWebhookUrl, contextBundle, {
      timeout: 10000, // Short timeout just for the trigger
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.error('❌ [GROWTH] Error triggering n8n workflow:', error.message);
      // Note: We don't fail the response here since it's fire-and-forget
    });

    // Mark the task as "in progress" for AI generation
    await prisma.followUpTask.update({
      where: { id: taskId },
      data: { 
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      }
    });

    console.log('✅ [GROWTH] AI reply generation triggered successfully');
    console.log('✅ [GROWTH] === ASYNC AI REPLY GENERATION SUCCESS ===');

    // Immediately respond to the frontend with 202 Accepted
    res.status(202).json({ 
      message: 'AI reply generation started successfully',
      taskId: task.id,
      status: 'in_progress',
      estimatedTime: '30-60 seconds',
      context: {
        contactName: contextBundle.contactName,
        companyName: contextBundle.companyName,
        originalSubject: contextBundle.originalEmail.subject
      }
    });

  } catch (error) {
    console.error('❌ [GROWTH] === ASYNC AI REPLY GENERATION ERROR ===');
    console.error('❌ [GROWTH] Error starting AI reply generation:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to start AI reply generation',
      message: 'Internal server error while starting AI reply generation.',
      details: error.message 
    });
  }
};

/**
 * 📥 AI REPLY CALLBACK: Receive completed AI reply from n8n
 * This endpoint is called by n8n when the AI reply generation is complete.
 * It saves the generated draft to the database and updates the task status.
 */
exports.handleAIReplyCallback = async (req, res) => {
  console.log('📥 [GROWTH] === AI REPLY CALLBACK RECEIVED ===');
  
  try {
    const { taskId, contactId, aiReply, subject, originalSubject, contactName, companyName } = req.body;

    console.log('📥 [GROWTH] AI reply callback data:', {
      taskId: taskId,
      contactId: contactId,
      hasAIReply: !!aiReply,
      replyLength: aiReply?.length || 0,
      subject: subject,
      contactName: contactName,
      companyName: companyName
    });

    // Validate required fields
    if (!taskId) {
      console.error('❌ [GROWTH] Missing taskId in callback');
      return res.status(400).json({ 
        error: 'Missing required field: taskId' 
      });
    }

    if (!aiReply) {
      console.error('❌ [GROWTH] Missing aiReply in callback');
      return res.status(400).json({ 
        error: 'Missing required field: aiReply' 
      });
    }

    // Fetch the task to verify it exists and get contactId if not provided
    const task = await prisma.followUpTask.findUnique({
      where: { id: taskId },
      include: {
        relatedContact: true,
        relatedEmail: true
      }
    });

    if (!task) {
      console.error('❌ [GROWTH] Task not found for callback:', taskId);
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'The specified task could not be found.'
      });
    }

    // Use contactId from callback or derive from task
    const actualContactId = contactId || task.relatedContactId;
    
    if (!actualContactId) {
      console.error('❌ [GROWTH] No contactId in callback and task has no relatedContactId');
      return res.status(400).json({ 
        error: 'Cannot determine contact ID',
        message: 'contactId not provided and task has no related contact.'
      });
    }

    // Generate a subject line if not provided
    const replySubject = subject || `Re: ${originalSubject || task.relatedEmail?.subject || 'Your Inquiry'}`;

    // Create the AI-generated reply draft as an OutreachEmail
    const aiReplyDraft = await prisma.outreachEmail.create({
      data: {
        targetContactId: actualContactId,
        subject: replySubject,
        body: aiReply,
        status: 'DRAFT', // This is an AI-generated draft
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [GROWTH] AI reply draft created:', {
      draftId: aiReplyDraft.id,
      contactId: actualContactId,
      subject: replySubject,
      bodyLength: aiReply.length
    });

    // Update the task status back to TODO and add a note about the AI draft
    const updatedTask = await prisma.followUpTask.update({
      where: { id: taskId },
      data: { 
        status: 'TODO',
        notes: task.notes + `\n\n--- AI REPLY DRAFT GENERATED ---\nDraft ID: ${aiReplyDraft.id}\nGenerated at: ${new Date().toISOString()}\nSubject: ${replySubject}`,
        updatedAt: new Date()
      }
    });

    console.log('✅ [GROWTH] Task updated with AI draft info:', {
      taskId: taskId,
      status: updatedTask.status,
      draftId: aiReplyDraft.id
    });

    console.log('✅ [GROWTH] === AI REPLY CALLBACK SUCCESS ===');

    // Respond to n8n
    res.status(201).json({ 
      success: true,
      message: 'AI reply draft saved successfully',
      data: {
        taskId: taskId,
        draftId: aiReplyDraft.id,
        contactId: actualContactId,
        subject: replySubject,
        status: 'draft_ready'
      }
    });

  } catch (error) {
    console.error('❌ [GROWTH] === AI REPLY CALLBACK ERROR ===');
    console.error('❌ [GROWTH] Error processing AI reply callback:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to save AI reply draft',
      message: 'Internal server error while processing the AI reply callback.',
      details: error.message 
    });
  }
};

/**
 * 📄 GET AI DRAFT: Get AI-generated draft content
 * Fetches the AI-generated draft content from OutreachEmail table.
 * Called by the frontend when viewing AI drafts.
 */
exports.getAIDraft = async (req, res) => {
  console.log('📄 [GROWTH] === GET AI DRAFT REQUEST ===');
  
  try {
    const { taskId } = req.params;
    const tenantId = req.user.tenantId;

    console.log('📄 [GROWTH] Getting AI draft for task:', {
      taskId: taskId,
      tenantId: tenantId
    });

    // First fetch the task to get the draft ID from the description
    const task = await prisma.followUpTask.findFirst({
      where: { 
        id: taskId,
        tenantId: tenantId
      }
    });

    if (!task) {
      console.log(`❌ [GROWTH] Task not found: ${taskId}`);
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Task not found or you do not have permission to access it.'
      });
    }

    // Extract draft ID from task description
    const draftIdMatch = task.notes?.match(/Draft ID: ([a-f0-9-]+)/);
    if (!draftIdMatch) {
      console.log(`❌ [GROWTH] No draft ID found in task: ${taskId}`);
      return res.status(404).json({ 
        error: 'No AI draft found',
        message: 'No AI draft has been generated for this task yet.'
      });
    }

    const draftId = draftIdMatch[1];
    console.log(`📄 [GROWTH] Found draft ID: ${draftId}`);

    // Fetch the AI draft from OutreachEmail
    const aiDraft = await prisma.outreachEmail.findUnique({
      where: { id: draftId },
      include: {
        targetContact: {
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
        }
      }
    });

    if (!aiDraft) {
      console.log(`❌ [GROWTH] AI draft not found: ${draftId}`);
      return res.status(404).json({ 
        error: 'AI draft not found',
        message: 'The AI draft could not be found in the database.'
      });
    }

    // Verify the draft belongs to the same tenant
    if (aiDraft.targetContact.discoveredSupplier.discoveredBrand.campaign.tenantId !== tenantId) {
      console.log(`❌ [GROWTH] Unauthorized access to draft: ${draftId}`);
      return res.status(403).json({ 
        error: 'Unauthorized access',
        message: 'You do not have permission to access this draft.'
      });
    }

    console.log(`✅ [GROWTH] AI draft retrieved: ${draftId}`);
    console.log('✅ [GROWTH] === GET AI DRAFT SUCCESS ===');

    res.status(200).json({
      draftId: aiDraft.id,
      subject: aiDraft.subject,
      body: aiDraft.body,
      createdAt: aiDraft.createdAt,
      contact: {
        id: aiDraft.targetContact.id,
        name: aiDraft.targetContact.name,
        email: aiDraft.targetContact.email,
        companyName: aiDraft.targetContact.discoveredSupplier.companyName
      }
    });

  } catch (error) {
    console.error('❌ [GROWTH] === GET AI DRAFT ERROR ===');
    console.error('❌ [GROWTH] Error fetching AI draft:', error);
    console.error('❌ [GROWTH] Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to fetch AI draft',
      message: 'Internal server error while fetching AI draft.',
      details: error.message 
    });
  }
};

/**
 * 📤 SEND AI REPLY: Send AI-generated reply through existing EmailSender workflow
 * This endpoint extracts the AI draft from the task and triggers the existing 
 * EmailSender workflow in n8n to send the approved reply.
 */
exports.sendAIReply = async (req, res) => {
  console.log('📤 [GROWTH] === SEND AI REPLY REQUEST ===');
  
  try {
    const { taskId } = req.params;
    const tenantId = req.user.tenantId;

    console.log('📤 [GROWTH] Sending AI reply for task:', {
      taskId: taskId,
      tenantId: tenantId
    });

    // First fetch the task to get the draft ID
    const task = await prisma.followUpTask.findFirst({
      where: { 
        id: taskId,
        tenantId: tenantId
      }
    });

    if (!task) {
      console.log(`❌ [GROWTH] Task not found: ${taskId}`);
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Task not found or you do not have permission to access it.'
      });
    }

    // Extract draft ID from task description
    const draftIdMatch = task.notes?.match(/Draft ID: ([a-f0-9-]+)/);
    if (!draftIdMatch) {
      console.log(`❌ [GROWTH] No draft ID found in task: ${taskId}`);
      return res.status(404).json({ 
        error: 'No AI draft found',
        message: 'No AI draft has been generated for this task yet. Please generate a draft first.'
      });
    }

    const emailId = draftIdMatch[1];
    console.log(`📤 [GROWTH] Found email draft ID: ${emailId}`);

    // Fetch the email draft to verify it exists and get details
    const emailDraft = await prisma.outreachEmail.findUnique({
      where: { id: emailId },
      include: {
        targetContact: {
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
        }
      }
    });

    if (!emailDraft) {
      console.log(`❌ [GROWTH] Email draft not found: ${emailId}`);
      return res.status(404).json({ 
        error: 'AI draft not found',
        message: 'The AI draft could not be found in the database.'
      });
    }

    // Verify the draft belongs to the same tenant
    if (emailDraft.targetContact.discoveredSupplier.discoveredBrand.campaign.tenantId !== tenantId) {
      console.log(`❌ [GROWTH] Unauthorized access to draft: ${emailId}`);
      return res.status(403).json({ 
        error: 'Unauthorized access',
        message: 'You do not have permission to send this draft.'
      });
    }

    // Check if email is already sent (allow resending)
    const isResend = emailDraft.status === 'SENT';
    if (isResend) {
      console.log(`🔄 [GROWTH] Email already sent, proceeding with resend: ${emailId}`);
    } else {
      console.log(`📤 [GROWTH] Sending email for the first time: ${emailId}`);
    }

    // Update email status to QUEUED before sending
    await prisma.outreachEmail.update({
      where: { id: emailId },
      data: { 
        status: 'QUEUED',
        updatedAt: new Date()
      }
    });

    console.log(`📤 [GROWTH] Email status updated to QUEUED: ${emailId}`);

    // Get the EmailSender webhook URL from environment
    const emailSenderWebhookUrl = process.env.N8N_EMAILSENDER_WEBHOOK_URL;
    console.log(`📤 [GROWTH] Environment check:`, {
      hasEmailSenderUrl: !!emailSenderWebhookUrl,
      webhookUrlPreview: emailSenderWebhookUrl ? emailSenderWebhookUrl.substring(0, 50) + '...' : 'None'
    });
    
    if (!emailSenderWebhookUrl) {
      console.error('❌ [GROWTH] N8N_EMAILSENDER_WEBHOOK_URL is not set');
      
      // Revert email status back to DRAFT
      await prisma.outreachEmail.update({
        where: { id: emailId },
        data: { 
          status: 'DRAFT',
          updatedAt: new Date()
        }
      });
      
      return res.status(500).json({ 
        error: 'Email service not configured',
        message: 'Email sending service is not configured. Please contact support.' 
      });
    }

    // Trigger the existing EmailSender workflow with the email ID
    console.log(`📡 [GROWTH] Triggering EmailSender workflow:`, {
      url: emailSenderWebhookUrl,
      emailId: emailId
    });
    
    const n8nResponse = await axios.post(emailSenderWebhookUrl, {
      emailId: emailId
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Texintelli-SPIMS/1.0'
      }
    });

    console.log(`✅ [GROWTH] EmailSender webhook called successfully:`, {
      status: n8nResponse.status,
      statusText: n8nResponse.statusText,
      responseData: n8nResponse.data
    });

    // Mark the task as completed and lower priority
    const replyAction = isResend ? 'RESENT' : 'SENT';
    await prisma.followUpTask.update({
      where: { id: taskId },
      data: { 
        status: 'DONE',
        priority: 'LOW', // Lower priority since task is completed
        notes: task.notes + `\n\n--- AI REPLY ${replyAction} ---\n${replyAction.charAt(0) + replyAction.slice(1).toLowerCase()} at: ${new Date().toISOString()}\nEmail ID: ${emailId}`,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [GROWTH] Task marked as completed: ${taskId}`);
    console.log('✅ [GROWTH] === SEND AI REPLY SUCCESS ===');

    // Return success response
    res.status(200).json({
      message: isResend ? 'AI reply resent successfully' : 'AI reply sent successfully',
      status: isResend ? 'resent' : 'sent',
      emailId: emailId,
      subject: emailDraft.subject,
      recipient: emailDraft.targetContact.email || 'No email address',
      contactName: emailDraft.targetContact.name,
      taskId: taskId,
      isResend: isResend
    });

  } catch (error) {
    console.error('❌ [GROWTH] === SEND AI REPLY ERROR ===');
    console.error('❌ [GROWTH] Error sending AI reply:', error);
    console.error('❌ [GROWTH] Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    console.error('❌ [GROWTH] Error stack:', error.stack);
    
    // If there was an error, revert the email status back to DRAFT
    if (req.params.taskId) {
      try {
        const task = await prisma.followUpTask.findUnique({
          where: { id: req.params.taskId }
        });
        
        if (task) {
          const draftIdMatch = task.notes?.match(/Draft ID: ([a-f0-9-]+)/);
          if (draftIdMatch) {
            await prisma.outreachEmail.update({
              where: { id: draftIdMatch[1] },
              data: { 
                status: 'DRAFT',
                updatedAt: new Date()
              }
            });
            console.log(`📤 [GROWTH] Reverted email status to DRAFT: ${draftIdMatch[1]}`);
          }
        }
      } catch (revertError) {
        console.error('❌ [GROWTH] Failed to revert email status:', revertError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to send AI reply',
      message: 'Internal server error while sending AI reply.',
      details: error.message 
    });
  }
};