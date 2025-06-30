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
      where: { tenant_id: tenantId },
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
      personaLength: persona.persona?.length || 0
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
      userId: req.user?.id || 'None'
    });
    
    if (!tenantId) {
      console.log('❌ [GROWTH] Missing tenant ID in token');
      return res.status(400).json({ error: 'Missing tenant ID in token' });
    }

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
        tenantId: tenantId
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
    hasPersona: !!req.body.persona,
    hasPersonaContent: !!req.body.personaContent,
    hasTenantId: !!req.body.tenantId,
    personaLength: req.body.persona?.length || req.body.personaContent?.length || 0,
    personaPreview: (req.body.persona || req.body.personaContent)?.substring(0, 100) + '...' || 'None'
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

    // Get persona content from request body
    const { persona, personaContent } = req.body;
    const personaData = persona || personaContent; // Support both field names
    console.log(`💾 [GROWTH] Persona data extraction:`, {
      hasPersona: !!persona,
      hasPersonaContent: !!personaContent,
      finalPersonaData: !!personaData,
      personaDataLength: personaData?.length || 0
    });

    if (!personaData || typeof personaData !== 'string') {
      console.log('❌ [GROWTH] Invalid persona data:', {
        personaData: personaData,
        type: typeof personaData
      });
      return res.status(400).json({ 
        error: 'Persona content is required and must be a string. Use "persona" or "personaContent" field.' 
      });
    }

    console.log(`💾 [GROWTH] Upserting persona for tenant: ${tenantId}`);

    const updatedPersona = await prisma.companyPersona.upsert({
      where: { tenant_id: tenantId },
      update: { 
        persona: personaData,
        updatedAt: new Date()
      },
      create: {
        tenant_id: tenantId,
        persona: personaData,
        isActive: true
      },
    });

    console.log(`✅ [GROWTH] Persona saved successfully:`, {
      id: updatedPersona.id,
      tenantId: updatedPersona.tenant_id,
      isActive: updatedPersona.isActive,
      createdAt: updatedPersona.createdAt,
      updatedAt: updatedPersona.updatedAt,
      personaLength: updatedPersona.persona.length
    });
    
    // Send success response back to n8n or frontend
    const responseData = {
      message: 'Persona saved successfully.',
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
      where: { tenant_id: tenantId },
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

    const campaign = await prisma.growthCampaign.create({
      data: {
        tenant_id: tenantId,
        name,
        keywords,
        region,
        status: 'DRAFT'
      },
      include: {
        discoveredBrands: true
      }
    });

    console.log(`✅ [GROWTH] Campaign created: ${campaign.id}`);
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
        tenant_id: tenantId // Ensure tenant ownership
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
        campaign_id: campaignId,
        campaign: {
          tenant_id: tenantId // Ensure tenant ownership
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
          tenant_id: tenantId // Ensure tenant ownership
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