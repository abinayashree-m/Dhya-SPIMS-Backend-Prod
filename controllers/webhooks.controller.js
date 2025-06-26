const { Webhook } = require('svix');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Verify webhook signature using Svix
 */
function verifyWebhookSignature(payload, headers) {
  console.log('🔍 [WEBHOOK] Starting signature verification...');
  console.log('🔍 [WEBHOOK] Headers received:', Object.keys(headers));
  
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ [WEBHOOK] RESEND_WEBHOOK_SECRET not configured');
      return false;
    }
    console.log('✅ [WEBHOOK] Webhook secret found');

    const wh = new Webhook(secret);
    const verifiedPayload = wh.verify(payload, headers);
    console.log('✅ [WEBHOOK] Signature verification successful');
    return verifiedPayload;
  } catch (error) {
    console.error('❌ [WEBHOOK] Webhook signature verification failed:', error.message);
    return false;
  }
}

/**
 * Process email events and update database
 */
async function processEmailEvent(eventData) {
  console.log('📧 [EVENT] Processing email event:', eventData.type);
  
  try {
    const { type, data } = eventData;
    
    // Map Resend event types to our enum
    const eventTypeMap = {
      'email.sent': 'SENT',
      'email.delivered': 'DELIVERED',
      'email.delivery_delayed': 'DELIVERY_DELAYED',
      'email.complained': 'COMPLAINED',
      'email.bounced': 'BOUNCED',
      'email.opened': 'OPENED',
      'email.clicked': 'CLICKED'
    };

    const eventType = eventTypeMap[type];
    if (!eventType) {
      console.warn(`⚠️ [EVENT] Unknown event type: ${type}`);
      return;
    }

    console.log(`📧 [EVENT] Mapped event type: ${type} -> ${eventType}`);

    // Extract campaign ID from tags if available
    let campaignId = null;
    if (data.tags && Array.isArray(data.tags)) {
      const campaignTag = data.tags.find(tag => tag.name === 'campaign_id');
      if (campaignTag) {
        campaignId = campaignTag.value;
        console.log(`📧 [EVENT] Found campaign ID: ${campaignId}`);
      }
    }

    console.log(`📧 [EVENT] Creating email event record for: ${data.to[0]}`);

    // Create email event record
    const emailEvent = await prisma.emailEvent.create({
      data: {
        emailId: data.email_id,
        campaignId,
        recipient: data.to[0], // Assuming single recipient
        eventType,
        eventData: {
          type,
          data,
          processedAt: new Date().toISOString()
        }
      }
    });

    console.log(`✅ [EVENT] Email event recorded: ${eventType} for ${data.to[0]} (ID: ${emailEvent.id})`);

    // Handle bounce events specifically
    if (type === 'email.bounced') {
      console.log(`📧 [BOUNCE] Processing bounce event for: ${data.to[0]}`);
      await handleBounceEvent(data);
    }

    return emailEvent;
  } catch (error) {
    console.error('❌ [EVENT] Error processing email event:', error);
    throw error;
  }
}

/**
 * Handle bounce events and update bounced email list
 */
async function handleBounceEvent(data) {
  console.log('📧 [BOUNCE] Starting bounce event processing...');
  
  try {
    const recipient = data.to[0];
    const bounceInfo = data.bounce || {};
    
    console.log(`📧 [BOUNCE] Recipient: ${recipient}`);
    console.log(`📧 [BOUNCE] Bounce info:`, bounceInfo);
    
    // Determine bounce type
    let bounceType = 'SOFT';
    if (bounceInfo.type === 'Permanent') {
      bounceType = 'HARD';
    } else if (bounceInfo.subType === 'Suppressed') {
      bounceType = 'SUPPRESSED';
    }

    console.log(`📧 [BOUNCE] Determined bounce type: ${bounceType}`);

    // Upsert bounced email record
    const bouncedEmail = await prisma.bouncedEmail.upsert({
      where: { email: recipient },
      update: {
        bounceType,
        bounceMessage: bounceInfo.message || null,
        lastBounced: new Date(),
        updatedAt: new Date()
      },
      create: {
        email: recipient,
        bounceType,
        bounceMessage: bounceInfo.message || null,
        lastBounced: new Date()
      }
    });

    console.log(`✅ [BOUNCE] Bounce recorded: ${bounceType} for ${recipient} (ID: ${bouncedEmail.id})`);
  } catch (error) {
    console.error('❌ [BOUNCE] Error handling bounce event:', error);
  }
}

/**
 * POST /webhooks/resend
 * Handle Resend webhook events
 */
exports.handleResendWebhook = async (req, res) => {
  console.log('🚀 [WEBHOOK] Received Resend webhook request');
  console.log('🚀 [WEBHOOK] Request method:', req.method);
  console.log('🚀 [WEBHOOK] Request headers:', Object.keys(req.headers));
  console.log('🚀 [WEBHOOK] Request body keys:', Object.keys(req.body));
  
  try {
    const payload = JSON.stringify(req.body);
    const headers = req.headers;

    console.log('🔍 [WEBHOOK] Payload length:', payload.length);
    console.log('🔍 [WEBHOOK] Verifying webhook signature...');

    // Verify webhook signature
    const verifiedPayload = verifyWebhookSignature(payload, headers);
    if (!verifiedPayload) {
      console.error('❌ [WEBHOOK] Webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log(`📧 [WEBHOOK] Processing webhook event: ${verifiedPayload.type}`);
    console.log(`📧 [WEBHOOK] Event data:`, JSON.stringify(verifiedPayload.data, null, 2));

    // Process the email event
    await processEmailEvent(verifiedPayload);

    console.log('✅ [WEBHOOK] Webhook processed successfully');
    // Return 200 to acknowledge receipt
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ [WEBHOOK] Webhook processing error:', error);
    console.error('❌ [WEBHOOK] Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /webhooks/events
 * Get email events with filtering
 */
exports.getEmailEvents = async (req, res) => {
  console.log('📊 [EVENTS] GET /webhooks/events request received');
  console.log('📊 [EVENTS] Query parameters:', req.query);
  
  try {
    const { 
      campaignId, 
      recipient, 
      eventType, 
      limit = 50, 
      offset = 0 
    } = req.query;

    console.log('📊 [EVENTS] Building where clause...');
    const where = {};
    if (campaignId) {
      where.campaignId = campaignId;
      console.log('📊 [EVENTS] Filtering by campaign ID:', campaignId);
    }
    if (recipient) {
      where.recipient = recipient;
      console.log('📊 [EVENTS] Filtering by recipient:', recipient);
    }
    if (eventType) {
      where.eventType = eventType;
      console.log('📊 [EVENTS] Filtering by event type:', eventType);
    }

    console.log('📊 [EVENTS] Final where clause:', where);
    console.log('📊 [EVENTS] Fetching events from database...');

    const events = await prisma.emailEvent.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            subject: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    console.log(`📊 [EVENTS] Found ${events.length} events`);

    const total = await prisma.emailEvent.count({ where });
    console.log(`📊 [EVENTS] Total events in database: ${total}`);

    const response = {
      events,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + events.length
      }
    };

    console.log('✅ [EVENTS] Sending response with events');
    res.json(response);
  } catch (error) {
    console.error('❌ [EVENTS] Error fetching email events:', error);
    console.error('❌ [EVENTS] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch email events' });
  }
};

/**
 * GET /webhooks/bounces
 * Get bounced email addresses
 */
exports.getBouncedEmails = async (req, res) => {
  console.log('📧 [BOUNCES] GET /webhooks/bounces request received');
  console.log('📧 [BOUNCES] Query parameters:', req.query);
  
  try {
    const { bounceType, limit = 50, offset = 0 } = req.query;

    console.log('📧 [BOUNCES] Building where clause...');
    const where = {};
    if (bounceType) {
      where.bounceType = bounceType;
      console.log('📧 [BOUNCES] Filtering by bounce type:', bounceType);
    }

    console.log('📧 [BOUNCES] Final where clause:', where);
    console.log('📧 [BOUNCES] Fetching bounced emails from database...');

    const bounces = await prisma.bouncedEmail.findMany({
      where,
      orderBy: { lastBounced: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    console.log(`📧 [BOUNCES] Found ${bounces.length} bounced emails`);

    const total = await prisma.bouncedEmail.count({ where });
    console.log(`📧 [BOUNCES] Total bounced emails in database: ${total}`);

    const response = {
      bounces,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + bounces.length
      }
    };

    console.log('✅ [BOUNCES] Sending response with bounced emails');
    res.json(response);
  } catch (error) {
    console.error('❌ [BOUNCES] Error fetching bounced emails:', error);
    console.error('❌ [BOUNCES] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch bounced emails' });
  }
};

/**
 * DELETE /webhooks/bounces/:email
 * Remove email from bounce list (for testing or manual override)
 */
exports.removeBouncedEmail = async (req, res) => {
  console.log('🗑️ [BOUNCE_DELETE] DELETE /webhooks/bounces/:email request received');
  console.log('🗑️ [BOUNCE_DELETE] Email to remove:', req.params.email);
  
  try {
    const { email } = req.params;

    console.log('🗑️ [BOUNCE_DELETE] Deleting bounced email from database...');
    await prisma.bouncedEmail.delete({
      where: { email }
    });

    console.log(`✅ [BOUNCE_DELETE] Removed ${email} from bounce list`);
    res.status(200).json({ message: 'Email removed from bounce list' });
  } catch (error) {
    console.error('❌ [BOUNCE_DELETE] Error removing bounced email:', error);
    console.error('❌ [BOUNCE_DELETE] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to remove bounced email' });
  }
};

/**
 * GET /webhooks/analytics
 * Get email analytics summary
 */
exports.getEmailAnalytics = async (req, res) => {
  console.log('📈 [ANALYTICS] GET /webhooks/analytics request received');
  console.log('📈 [ANALYTICS] Query parameters:', req.query);
  
  try {
    const { campaignId, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    console.log('📈 [ANALYTICS] Start date:', startDate);
    console.log('📈 [ANALYTICS] Days:', days);

    const where = {
      createdAt: {
        gte: startDate
      }
    };
    if (campaignId) {
      where.campaignId = campaignId;
      console.log('📈 [ANALYTICS] Filtering by campaign ID:', campaignId);
    }

    console.log('📈 [ANALYTICS] Final where clause:', where);

    console.log('📈 [ANALYTICS] Getting event counts by type...');
    // Get event counts by type
    const eventCounts = await prisma.emailEvent.groupBy({
      by: ['eventType'],
      where,
      _count: {
        eventType: true
      }
    });

    console.log('📈 [ANALYTICS] Event counts:', eventCounts);

    console.log('📈 [ANALYTICS] Getting total events...');
    // Get total events
    const totalEvents = await prisma.emailEvent.count({ where });
    console.log('📈 [ANALYTICS] Total events:', totalEvents);

    console.log('📈 [ANALYTICS] Getting unique recipients...');
    // Get unique recipients
    const uniqueRecipients = await prisma.emailEvent.groupBy({
      by: ['recipient'],
      where,
      _count: {
        recipient: true
      }
    });

    console.log('📈 [ANALYTICS] Unique recipients count:', uniqueRecipients.length);

    console.log('📈 [ANALYTICS] Getting bounce count...');
    // Get bounce count
    const bounceCount = await prisma.bouncedEmail.count({
      where: {
        lastBounced: {
          gte: startDate
        }
      }
    });

    console.log('📈 [ANALYTICS] Bounce count:', bounceCount);

    const analytics = {
      period: `${days} days`,
      totalEvents,
      uniqueRecipients: uniqueRecipients.length,
      bounceCount,
      eventBreakdown: eventCounts.reduce((acc, event) => {
        acc[event.eventType] = event._count.eventType;
        return acc;
      }, {})
    };

    console.log('📈 [ANALYTICS] Final analytics object:', analytics);
    console.log('✅ [ANALYTICS] Sending analytics response');
    res.json(analytics);
  } catch (error) {
    console.error('❌ [ANALYTICS] Error fetching email analytics:', error);
    console.error('❌ [ANALYTICS] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch email analytics' });
  }
};

exports.resendWebhook = async (req, res) => {
  try {
    const event = req.body;
    console.log('[Resend Webhook] Event received:', JSON.stringify(event, null, 2));

    // Map Resend event to EmailEvent model
    // Example Resend event: { id, type, data: { email, ... } }
    const emailId = event.id || event.data?.id || null;
    const recipient = event.data?.to || event.data?.recipient || null;
    const eventType = event.type?.toUpperCase() || null;
    const eventData = event.data || null;
    const createdAt = event.created_at ? new Date(event.created_at) : new Date();

    if (emailId && recipient && eventType) {
      await prisma.emailEvent.create({
        data: {
          emailId,
          recipient,
          eventType,
          eventData,
          createdAt,
        },
      });
      console.log('[Resend Webhook] Event stored:', emailId, recipient, eventType);
    } else {
      console.warn('[Resend Webhook] Missing required fields, not stored:', { emailId, recipient, eventType });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Resend Webhook] Error handling event:', err);
    res.status(500).send('Error');
  }
}; 