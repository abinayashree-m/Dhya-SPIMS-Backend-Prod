const { PrismaClient } = require('@prisma/client');
const { sendBulkMarketingEmail, sendBulkMarketingEmailBatched, filterBouncedEmails, filterBouncedEmailsOptimized } = require('../utils/email');
const { fetchEmailsByDateRange } = require('../services/resend.service');
const { getAudienceContacts } = require('../services/resend.service');

const prisma = new PrismaClient();

/**
 * POST /marketing/send-to-audience
 * Send campaign to a Resend audience
 */
exports.sendToAudience = async (req, res) => {
  try {
    console.log('🎯 [SEND-TO-AUDIENCE] Request received:', {
      body: req.body,
      headers: req.headers
    });

    const { audienceId, subject, bodyHtml, tenant_id } = req.body;

    console.log('🎯 [SEND-TO-AUDIENCE] Extracted fields:', {
      audienceId,
      subject,
      bodyHtml: bodyHtml ? 'Present' : 'Missing',
      tenant_id
    });

    if (!audienceId || !subject || !bodyHtml || !tenant_id) {
      console.log('❌ [SEND-TO-AUDIENCE] Missing fields:', {
        hasAudienceId: !!audienceId,
        hasSubject: !!subject,
        hasBodyHtml: !!bodyHtml,
        hasTenantId: !!tenant_id
      });
      return res.status(400).json({ error: 'Missing fields in request body' });
    }

    console.log(`🎯 Sending campaign to Resend audience: ${audienceId}`);

    // 1. Get contacts from Resend audience
    const contacts = await getAudienceContacts(audienceId);
    const toEmails = contacts.map(contact => contact.email);

    if (toEmails.length === 0) {
      return res.status(400).json({ 
        error: 'No contacts found in the specified audience',
        audienceId
      });
    }

    console.log(`📧 Found ${toEmails.length} contacts in audience`);

    // 2. Filter out bounced emails
    const { validEmails, bouncedEmails } = await filterBouncedEmails(toEmails);

    if (validEmails.length === 0) {
      return res.status(400).json({ 
        error: 'All emails in the audience are bounced or invalid',
        bouncedCount: bouncedEmails.length
      });
    }

    // 3. Save campaign in DB
    const campaignRecord = await prisma.campaign.create({
      data: {
        name: subject,
        subject,
        bodyHtml,
        recipients: validEmails,
        tenantId: tenant_id, // Convert from snake_case to camelCase
      },
    });

    // 4. Send emails with campaign tracking
    const emailResults = await sendBulkMarketingEmail({
      toEmails: validEmails,
      subject,
      bodyHtml,
      campaignId: campaignRecord.id,
      tenant_id,
    });

    // 5. Update campaign with results
    const successCount = emailResults.results.length;
    const failureCount = emailResults.errors.length;

    await prisma.campaign.update({
      where: { id: campaignRecord.id },
      data: {
        name: `${subject} (${successCount} sent, ${failureCount} failed)`,
      },
    });

    console.log(`✅ Campaign sent to audience: ${successCount} sent, ${failureCount} failed`);

    res.status(200).json({
      message: 'Campaign sent to audience successfully!',
      campaign: campaignRecord,
      summary: {
        audienceId,
        totalContacts: toEmails.length,
        validEmails: validEmails.length,
        bouncedEmails: bouncedEmails.length,
        sentSuccessfully: successCount,
        failedToSend: failureCount,
        bouncedEmailsList: bouncedEmails
      },
      emailResults
    });
  } catch (err) {
    console.error('❌ sendToAudience error:', err);
    res.status(500).json({ error: 'Failed to send campaign to audience' });
  }
};

/**
 * POST /marketing/send
 * Send bulk email using Resend API and store the campaign
 */
exports.sendBulkEmail = async (req, res) => {
  try {
    const { toEmails, subject, bodyHtml, tenant_id } = req.body;

    if (!toEmails || !subject || !bodyHtml || !tenant_id) {
      return res.status(400).json({ error: 'Missing fields in request body' });
    }

    // ✅ 1. Filter out bounced emails
    const { validEmails, bouncedEmails } = await filterBouncedEmails(toEmails);

    if (validEmails.length === 0) {
      return res.status(400).json({ 
        error: 'All emails in the list are bounced or invalid',
        bouncedCount: bouncedEmails.length
      });
    }

    // ✅ 2. Save campaign in DB first
    const campaignRecord = await prisma.campaign.create({
      data: {
        name: subject,
        subject,
        bodyHtml,
        recipients: validEmails, // Only valid emails
        tenant_id,
      },
    });

    // ✅ 3. Send emails with campaign tracking
    const emailResults = await sendBulkMarketingEmail({
      toEmails: validEmails,
      subject,
      bodyHtml,
      campaignId: campaignRecord.id,
      tenant_id,
    });

    // ✅ 4. Update campaign with results
    const successCount = emailResults.results.length;
    const failureCount = emailResults.errors.length;

    await prisma.campaign.update({
      where: { id: campaignRecord.id },
      data: {
        name: `${subject} (${successCount} sent, ${failureCount} failed)`,
      },
    });

    res.status(200).json({
      message: 'Campaign processed successfully!',
      campaign: campaignRecord,
      summary: {
        totalRequested: toEmails.length,
        validEmails: validEmails.length,
        bouncedEmails: bouncedEmails.length,
        sentSuccessfully: successCount,
        failedToSend: failureCount,
        bouncedEmailsList: bouncedEmails
      },
      emailResults
    });
  } catch (err) {
    console.error('❌ sendBulkEmail error:', err);
    res.status(500).json({ error: 'Failed to send emails' });
  }
};

/**
 * GET /marketing/campaigns
 * Retrieve all past campaigns with analytics
 */
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        emailEvents: {
          select: {
            eventType: true,
            recipient: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Add analytics to each campaign
    const campaignsWithAnalytics = campaigns.map(campaign => {
      const events = campaign.emailEvents;
      const analytics = {
        totalEvents: events.length,
        sent: events.filter(e => e.eventType === 'SENT').length,
        delivered: events.filter(e => e.eventType === 'DELIVERED').length,
        opened: events.filter(e => e.eventType === 'OPENED').length,
        clicked: events.filter(e => e.eventType === 'CLICKED').length,
        bounced: events.filter(e => e.eventType === 'BOUNCED').length,
        complained: events.filter(e => e.eventType === 'COMPLAINED').length,
        uniqueRecipients: new Set(events.map(e => e.recipient)).size
      };

      return {
        ...campaign,
        analytics
      };
    });

    res.status(200).json(campaignsWithAnalytics);
  } catch (err) {
    console.error('❌ getCampaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};

/**
 * GET /marketing/campaigns/:id
 * Get detailed campaign analytics
 */
exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        emailEvents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Calculate detailed analytics
    const events = campaign.emailEvents;
    const analytics = {
      totalEvents: events.length,
      sent: events.filter(e => e.eventType === 'SENT').length,
      delivered: events.filter(e => e.eventType === 'DELIVERED').length,
      opened: events.filter(e => e.eventType === 'OPENED').length,
      clicked: events.filter(e => e.eventType === 'CLICKED').length,
      bounced: events.filter(e => e.eventType === 'BOUNCED').length,
      complained: events.filter(e => e.eventType === 'COMPLAINED').length,
      uniqueRecipients: new Set(events.map(e => e.recipient)).size,
      deliveryRate: events.length > 0 ? 
        (events.filter(e => e.eventType === 'DELIVERED').length / events.filter(e => e.eventType === 'SENT').length * 100).toFixed(2) : 0,
      openRate: events.length > 0 ? 
        (events.filter(e => e.eventType === 'OPENED').length / events.filter(e => e.eventType === 'DELIVERED').length * 100).toFixed(2) : 0,
      clickRate: events.length > 0 ? 
        (events.filter(e => e.eventType === 'CLICKED').length / events.filter(e => e.eventType === 'OPENED').length * 100).toFixed(2) : 0
    };

    res.status(200).json({
      ...campaign,
      analytics
    });
  } catch (err) {
    console.error('❌ getCampaignById error:', err);
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
};

/**
 * POST /marketing/send-large
 * Send large bulk email campaigns with optimized processing
 */
exports.sendLargeBulkEmail = async (req, res) => {
  try {
    const { 
      toEmails, 
      subject, 
      bodyHtml, 
      tenant_id,
      batchSize = 100,
      delayBetweenBatches = 1000,
      useBatchedProcessing = true
    } = req.body;

    if (!toEmails || !subject || !bodyHtml || !tenant_id) {
      return res.status(400).json({ error: 'Missing fields in request body' });
    }

    console.log(`🚀 Starting large email campaign: ${toEmails.length} emails`);

    // ✅ 1. Optimized bounce filtering for large lists
    console.log('🔍 Filtering bounced emails...');
    const { validEmails, bouncedEmails } = toEmails.length > 1000 
      ? await filterBouncedEmailsOptimized(toEmails)
      : await filterBouncedEmails(toEmails);
    console.log(`✅ Bounce filtering complete: ${validEmails.length} valid, ${bouncedEmails.length} bounced`);

    if (validEmails.length === 0) {
      return res.status(400).json({ 
        error: 'All emails in the list are bounced or invalid',
        bouncedCount: bouncedEmails.length
      });
    }

    // ✅ 2. Save campaign in DB first
    const campaignRecord = await prisma.campaign.create({
      data: {
        name: subject,
        subject,
        bodyHtml,
        recipients: validEmails,
        tenant_id,
      },
    });

    console.log(`📝 Campaign saved to database: ${campaignRecord.id}`);

    // ✅ 3. Send emails with appropriate method
    let emailResults;
    if (useBatchedProcessing && validEmails.length > 500) {
      console.log('🚀 Using batched processing for large campaign');
      emailResults = await sendBulkMarketingEmailBatched({
        toEmails: validEmails,
        subject,
        bodyHtml,
        campaignId: campaignRecord.id,
        tenant_id,
        batchSize,
        delayBetweenBatches,
      });
    } else {
      console.log('📧 Using standard processing for smaller campaign');
      emailResults = await sendBulkMarketingEmail({
        toEmails: validEmails,
        subject,
        bodyHtml,
        campaignId: campaignRecord.id,
        tenant_id,
      });
    }

    // ✅ 4. Update campaign with results
    const successCount = emailResults.results.length;
    const failureCount = emailResults.errors.length;

    await prisma.campaign.update({
      where: { id: campaignRecord.id },
      data: {
        name: `${subject} (${successCount} sent, ${failureCount} failed)`,
      },
    });

    console.log(`✅ Campaign completed: ${successCount} sent, ${failureCount} failed`);

    res.status(200).json({
      message: 'Large campaign processed successfully!',
      campaign: campaignRecord,
      summary: {
        totalRequested: toEmails.length,
        validEmails: validEmails.length,
        bouncedEmails: bouncedEmails.length,
        sentSuccessfully: successCount,
        failedToSend: failureCount,
        successRate: emailResults.summary?.successRate || ((successCount / validEmails.length) * 100).toFixed(2) + '%',
        processingMethod: useBatchedProcessing && validEmails.length > 500 ? 'batched' : 'standard',
        batchSize: useBatchedProcessing ? batchSize : 'N/A',
        bouncedEmailsList: bouncedEmails
      },
      emailResults
    });
  } catch (err) {
    console.error('❌ sendLargeBulkEmail error:', err);
    res.status(500).json({ error: 'Failed to send large email campaign' });
  }
};

/**
 * GET /marketing/campaigns/:id/missed-emails
 * Get list of emails that were not sent in a campaign
 */
exports.getCampaignMissedEmails = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Analyzing campaign ${id} for missed emails...`);

    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        emailEvents: {
          select: {
            recipient: true,
            eventType: true,
            createdAt: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get all recipients from the campaign
    const allRecipients = campaign.recipients || [];
    console.log(`📧 Campaign has ${allRecipients.length} total recipients`);

    // Get emails that have SENT events
    const sentEmails = new Set(
      campaign.emailEvents
        .filter(event => event.eventType === 'SENT')
        .map(event => event.recipient)
    );
    console.log(`✅ Found ${sentEmails.size} emails with SENT events`);

    // Get emails that have DELIVERED events
    const deliveredEmails = new Set(
      campaign.emailEvents
        .filter(event => event.eventType === 'DELIVERED')
        .map(event => event.recipient)
    );
    console.log(`📨 Found ${deliveredEmails.size} emails with DELIVERED events`);

    // Identify missed emails (recipients without SENT events)
    const missedEmails = allRecipients.filter(email => !sentEmails.has(email));
    console.log(`❌ Found ${missedEmails.length} missed emails`);

    // Identify emails that were sent but not delivered
    const sentButNotDelivered = Array.from(sentEmails).filter(email => !deliveredEmails.has(email));
    console.log(`⚠️ Found ${sentButNotDelivered.length} emails sent but not delivered`);

    // Get bounce events
    const bouncedEmails = new Set(
      campaign.emailEvents
        .filter(event => event.eventType === 'BOUNCED')
        .map(event => event.recipient)
    );
    console.log(`🚫 Found ${bouncedEmails.size} bounced emails`);

    // Filter out bounced emails from missed emails
    const resendableEmails = missedEmails.filter(email => !bouncedEmails.has(email));
    console.log(`🔄 ${resendableEmails.length} emails are resendable (excluding bounces)`);

    res.status(200).json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        totalRecipients: allRecipients.length,
        createdAt: campaign.createdAt
      },
      analysis: {
        totalRecipients: allRecipients.length,
        sentEmails: sentEmails.size,
        deliveredEmails: deliveredEmails.size,
        missedEmails: missedEmails.length,
        sentButNotDelivered: sentButNotDelivered.length,
        bouncedEmails: bouncedEmails.size,
        resendableEmails: resendableEmails.length
      },
      emails: {
        sent: Array.from(sentEmails),
        delivered: Array.from(deliveredEmails),
        missed: missedEmails,
        sentButNotDelivered,
        bounced: Array.from(bouncedEmails),
        resendable: resendableEmails
      }
    });
  } catch (err) {
    console.error('❌ getCampaignMissedEmails error:', err);
    res.status(500).json({ error: 'Failed to analyze campaign missed emails' });
  }
};

/**
 * POST /marketing/campaigns/:id/resend-missed
 * Resend emails that were missed in a campaign
 */
exports.resendMissedEmails = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      resendType = 'missed', // 'missed', 'sent_but_not_delivered', 'all_failed'
      batchSize = 100,
      delayBetweenBatches = 1000
    } = req.body;

    console.log(`🔄 Starting resend for campaign ${id}, type: ${resendType}`);

    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        emailEvents: {
          select: {
            recipient: true,
            eventType: true,
            createdAt: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get all recipients and events
    const allRecipients = campaign.recipients || [];
    const sentEmails = new Set(
      campaign.emailEvents
        .filter(event => event.eventType === 'SENT')
        .map(event => event.recipient)
    );
    const deliveredEmails = new Set(
      campaign.emailEvents
        .filter(event => event.eventType === 'DELIVERED')
        .map(event => event.recipient)
    );
    const bouncedEmails = new Set(
      campaign.emailEvents
        .filter(event => event.eventType === 'BOUNCED')
        .map(event => event.recipient)
    );

    // Determine which emails to resend based on type
    let emailsToResend = [];
    
    switch (resendType) {
      case 'missed':
        // Emails that were never sent
        emailsToResend = allRecipients.filter(email => !sentEmails.has(email));
        break;
      case 'sent_but_not_delivered':
        // Emails that were sent but not delivered
        emailsToResend = Array.from(sentEmails).filter(email => !deliveredEmails.has(email));
        break;
      case 'all_failed':
        // All emails that were either missed or sent but not delivered
        const missed = allRecipients.filter(email => !sentEmails.has(email));
        const sentButNotDelivered = Array.from(sentEmails).filter(email => !deliveredEmails.has(email));
        emailsToResend = [...new Set([...missed, ...sentButNotDelivered])];
        break;
      default:
        return res.status(400).json({ error: 'Invalid resend type' });
    }

    // Filter out bounced emails
    emailsToResend = emailsToResend.filter(email => !bouncedEmails.has(email));

    if (emailsToResend.length === 0) {
      return res.status(400).json({ 
        error: 'No emails to resend',
        message: `All emails in category '${resendType}' have either been sent successfully or are bounced`
      });
    }

    console.log(`📧 Resending ${emailsToResend.length} emails for campaign ${id}`);

    // Create a new campaign record for the resend
    const resendCampaignRecord = await prisma.campaign.create({
      data: {
        name: `Resend: ${campaign.name}`,
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
        recipients: emailsToResend,
        tenant_id: campaign.tenant_id,
      },
    });

    console.log(`📝 Created resend campaign: ${resendCampaignRecord.id}`);

    // Send emails using batched processing
    const emailResults = await sendBulkMarketingEmailBatched({
      toEmails: emailsToResend,
      subject: campaign.subject,
      bodyHtml: campaign.bodyHtml,
      campaignId: resendCampaignRecord.id,
      tenant_id: campaign.tenant_id,
      batchSize,
      delayBetweenBatches,
    });

    // Update resend campaign with results
    const successCount = emailResults.results.length;
    const failureCount = emailResults.errors.length;

    await prisma.campaign.update({
      where: { id: resendCampaignRecord.id },
      data: {
        name: `Resend: ${campaign.name} (${successCount} sent, ${failureCount} failed)`,
      },
    });

    console.log(`✅ Resend campaign completed: ${successCount} sent, ${failureCount} failed`);

    res.status(200).json({
      message: 'Resend campaign processed successfully!',
      originalCampaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject
      },
      resendCampaign: resendCampaignRecord,
      summary: {
        resendType,
        totalToResend: emailsToResend.length,
        sentSuccessfully: successCount,
        failedToSend: failureCount,
        successRate: ((successCount / emailsToResend.length) * 100).toFixed(2) + '%',
        processingMethod: 'batched',
        batchSize
      },
      emailResults
    });
  } catch (err) {
    console.error('❌ resendMissedEmails error:', err);
    res.status(500).json({ error: 'Failed to resend missed emails' });
  }
};

/**
 * GET /marketing/campaigns/:id/status
 * Get detailed status of a campaign including sent, delivered, bounced, etc.
 */
exports.getCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        emailEvents: {
          select: {
            recipient: true,
            eventType: true,
            createdAt: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const allRecipients = campaign.recipients || [];
    const events = campaign.emailEvents;

    // Group events by recipient
    const recipientEvents = {};
    allRecipients.forEach(recipient => {
      recipientEvents[recipient] = {
        email: recipient,
        events: [],
        lastEvent: null,
        status: 'pending'
      };
    });

    // Populate events for each recipient
    events.forEach(event => {
      if (recipientEvents[event.recipient]) {
        recipientEvents[event.recipient].events.push(event);
        if (!recipientEvents[event.recipient].lastEvent || 
            new Date(event.createdAt) > new Date(recipientEvents[event.recipient].lastEvent.createdAt)) {
          recipientEvents[event.recipient].lastEvent = event;
        }
      }
    });

    // Determine status for each recipient
    Object.values(recipientEvents).forEach(recipient => {
      const hasSent = recipient.events.some(e => e.eventType === 'SENT');
      const hasDelivered = recipient.events.some(e => e.eventType === 'DELIVERED');
      const hasBounced = recipient.events.some(e => e.eventType === 'BOUNCED');
      const hasOpened = recipient.events.some(e => e.eventType === 'OPENED');
      const hasClicked = recipient.events.some(e => e.eventType === 'CLICKED');

      if (hasBounced) {
        recipient.status = 'bounced';
      } else if (hasClicked) {
        recipient.status = 'clicked';
      } else if (hasOpened) {
        recipient.status = 'opened';
      } else if (hasDelivered) {
        recipient.status = 'delivered';
      } else if (hasSent) {
        recipient.status = 'sent';
      } else {
        recipient.status = 'pending';
      }
    });

    // Calculate summary statistics
    const statusCounts = {
      pending: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0
    };

    Object.values(recipientEvents).forEach(recipient => {
      statusCounts[recipient.status]++;
    });

    res.status(200).json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        totalRecipients: allRecipients.length,
        createdAt: campaign.createdAt
      },
      summary: statusCounts,
      recipients: Object.values(recipientEvents)
    });
  } catch (err) {
    console.error('❌ getCampaignStatus error:', err);
    res.status(500).json({ error: 'Failed to get campaign status' });
  }
};

/**
 * POST /marketing/analyze-direct-emails
 * Analyze emails sent directly through Resend (without campaign tracking)
 * and help identify missed emails for resending
 */
exports.analyzeDirectEmails = async (req, res) => {
  try {
    const { 
      originalEmailList, 
      subject, 
      bodyHtml, 
      tenant_id,
      startDate,
      endDate 
    } = req.body;

    console.log('🚀 [ANALYZE_DIRECT_EMAILS] Starting analysis...');
    console.log(`📋 [ANALYZE_DIRECT_EMAILS] Request body:`, {
      originalEmailListLength: originalEmailList?.length,
      subject: subject?.substring(0, 50) + (subject?.length > 50 ? '...' : ''),
      tenant_id,
      startDate,
      endDate
    });

    if (!originalEmailList || !Array.isArray(originalEmailList)) {
      console.log('❌ [ANALYZE_DIRECT_EMAILS] Invalid originalEmailList - must be an array');
      return res.status(400).json({ error: 'originalEmailList must be an array of email addresses' });
    }

    console.log(`🔍 [ANALYZE_DIRECT_EMAILS] Analyzing direct emails: ${originalEmailList.length} original emails`);

    // Get date range for analysis (default to last 7 days)
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    console.log(`📅 [ANALYZE_DIRECT_EMAILS] Date range: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);
    console.log(`⏱️ [ANALYZE_DIRECT_EMAILS] Time span: ${Math.round((endDateObj - startDateObj) / (1000 * 60 * 60 * 24))} days`);

    // ✅ STEP 1: Fetch emails from Resend API by date range
    console.log('🔍 [ANALYZE_DIRECT_EMAILS] Fetching emails from Resend API...');
    const resendStartTime = Date.now();
    
    let resendEmails = [];
    let resendApiError = null;
    
    try {
      resendEmails = await fetchEmailsByDateRange(
        startDateObj.toISOString(),
        endDateObj.toISOString(),
        100 // Limit to 100 emails for now
      );
      const resendEndTime = Date.now();
      console.log(`⏱️ [ANALYZE_DIRECT_EMAILS] Resend API fetch completed in ${resendEndTime - resendStartTime}ms`);
      console.log(`📊 [ANALYZE_DIRECT_EMAILS] Found ${resendEmails.length} emails from Resend API`);
    } catch (error) {
      const resendEndTime = Date.now();
      resendApiError = error.message;
      console.error('❌ [ANALYZE_DIRECT_EMAILS] Failed to fetch from Resend API:', error.message);
      console.log('⚠️ [ANALYZE_DIRECT_EMAILS] Resend API returned 405 error - endpoint may not be available with current API key');
      console.log('⚠️ [ANALYZE_DIRECT_EMAILS] Falling back to local database analysis only');
      console.log('💡 [ANALYZE_DIRECT_EMAILS] To enable Resend API analysis, check API key permissions or use webhooks for event tracking');
      resendEmails = [];
    }

    // ✅ STEP 2: Query local EmailEvent table for events in the date range
    console.log('🔍 [ANALYZE_DIRECT_EMAILS] Querying local database for email events...');
    const dbStartTime = Date.now();
    
    const localEvents = await prisma.emailEvent.findMany({
      where: {
        recipient: { in: originalEmailList },
        createdAt: {
          gte: startDateObj,
          lte: endDateObj,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const dbEndTime = Date.now();
    console.log(`⏱️ [ANALYZE_DIRECT_EMAILS] Database query completed in ${dbEndTime - dbStartTime}ms`);
    console.log(`📊 [ANALYZE_DIRECT_EMAILS] Found ${localEvents.length} local events for analysis`);

    // ✅ STEP 3: Combine and process all events
    console.log('🔄 [ANALYZE_DIRECT_EMAILS] Processing events to categorize emails...');
    const processStartTime = Date.now();
    
    const sentEmails = new Set();
    const deliveredEmails = new Set();
    const openedEmails = new Set();
    const clickedEmails = new Set();
    const bouncedEmails = new Set();
    const resendEmailMap = new Map(); // Map email addresses to Resend email details

    // Process Resend API emails
    resendEmails.forEach(email => {
      const recipientEmail = email.to;
      if (originalEmailList.includes(recipientEmail)) {
        resendEmailMap.set(recipientEmail, email);
        
        // Categorize based on last_event
        switch (email.last_event) {
          case 'delivered':
            deliveredEmails.add(recipientEmail);
            sentEmails.add(recipientEmail); // If delivered, it was also sent
            break;
          case 'sent':
            sentEmails.add(recipientEmail);
            break;
          case 'bounced':
            bouncedEmails.add(recipientEmail);
            break;
          case 'opened':
            openedEmails.add(recipientEmail);
            deliveredEmails.add(recipientEmail);
            sentEmails.add(recipientEmail);
            break;
          case 'clicked':
            clickedEmails.add(recipientEmail);
            openedEmails.add(recipientEmail);
            deliveredEmails.add(recipientEmail);
            sentEmails.add(recipientEmail);
            break;
          default:
            console.log(`⚠️ [ANALYZE_DIRECT_EMAILS] Unknown Resend event type: ${email.last_event} for ${recipientEmail}`);
        }
      }
    });

    // Process local database events (these might have more detailed event history)
    localEvents.forEach((event, index) => {
      const email = event.recipient;
      
      switch (event.eventType) {
        case 'SENT':
          sentEmails.add(email);
          break;
        case 'DELIVERED':
          deliveredEmails.add(email);
          break;
        case 'OPENED':
          openedEmails.add(email);
          break;
        case 'CLICKED':
          clickedEmails.add(email);
          break;
        case 'BOUNCED':
          bouncedEmails.add(email);
          break;
        default:
          console.log(`⚠️ [ANALYZE_DIRECT_EMAILS] Unknown local event type: ${event.eventType} for ${email}`);
      }
    });

    const processEndTime = Date.now();
    console.log(`⏱️ [ANALYZE_DIRECT_EMAILS] Event processing completed in ${processEndTime - processStartTime}ms`);

    // Log categorization results
    console.log('📊 [ANALYZE_DIRECT_EMAILS] Email categorization results:');
    console.log(`   📧 Sent: ${sentEmails.size} emails`);
    console.log(`   ✅ Delivered: ${deliveredEmails.size} emails`);
    console.log(`   👁️ Opened: ${openedEmails.size} emails`);
    console.log(`   🔗 Clicked: ${clickedEmails.size} emails`);
    console.log(`   ❌ Bounced: ${bouncedEmails.size} emails`);
    console.log(`   📡 Resend API emails found: ${resendEmailMap.size}`);
    console.log(`   🗄️ Local DB events found: ${localEvents.length}`);

    // Calculate missed emails (emails that were never sent or delivered)
    console.log('🔍 [ANALYZE_DIRECT_EMAILS] Calculating missed emails...');
    const missedEmails = originalEmailList.filter(email => 
      !sentEmails.has(email) && !deliveredEmails.has(email)
    );

    console.log(`📧 [ANALYZE_DIRECT_EMAILS] Missed emails calculation: ${missedEmails.length} out of ${originalEmailList.length} total`);

    // Log some sample missed emails for debugging
    if (missedEmails.length > 0) {
      console.log('📋 [ANALYZE_DIRECT_EMAILS] Sample missed emails:');
      missedEmails.slice(0, 5).forEach((email, index) => {
        console.log(`   ${index + 1}. ${email}`);
      });
      if (missedEmails.length > 5) {
        console.log(`   ... and ${missedEmails.length - 5} more missed emails`);
      }
    }

    // Log some sample found emails for debugging
    if (sentEmails.size > 0) {
      console.log('📋 [ANALYZE_DIRECT_EMAILS] Sample found emails:');
      Array.from(sentEmails).slice(0, 3).forEach((email, index) => {
        const resendEmail = resendEmailMap.get(email);
        console.log(`   ${index + 1}. ${email} - Resend ID: ${resendEmail?.id || 'N/A'}, Last Event: ${resendEmail?.last_event || 'N/A'}`);
      });
    }

    const result = {
      totalOriginalEmails: originalEmailList.length,
      sentEmails: Array.from(sentEmails),
      deliveredEmails: Array.from(deliveredEmails),
      openedEmails: Array.from(openedEmails),
      clickedEmails: Array.from(clickedEmails),
      bouncedEmails: Array.from(bouncedEmails),
      missedEmails: missedEmails,
      resendApiEmails: Array.from(resendEmailMap.values()),
      resendApiError: resendApiError,
      summary: {
        sent: sentEmails.size,
        delivered: deliveredEmails.size,
        opened: openedEmails.size,
        clicked: clickedEmails.size,
        bounced: bouncedEmails.size,
        missed: missedEmails.length,
        resendApiEmailsFound: resendEmailMap.size,
        localEventsFound: localEvents.length,
        deliveryRate: originalEmailList.length > 0 ? ((deliveredEmails.size / originalEmailList.length) * 100).toFixed(1) : '0',
        openRate: originalEmailList.length > 0 ? ((openedEmails.size / originalEmailList.length) * 100).toFixed(1) : '0',
      },
      recommendations: {
        resendApiIssue: resendApiError ? {
          error: resendApiError,
          solution: "The Resend API endpoint /emails is returning 405 Method Not Allowed. This could be due to:",
          possibleCauses: [
            "API key doesn't have permission to read email history",
            "The /emails endpoint is not available in your Resend plan",
            "API key is restricted to sending emails only"
          ],
          alternatives: [
            "Set up webhooks to track email events in real-time",
            "Use campaign tracking for better email analytics",
            "Contact Resend support to enable email history access"
          ]
        } : null
      }
    };

    console.log('📊 [ANALYZE_DIRECT_EMAILS] Final summary:');
    console.log(`   📧 Total original emails: ${result.totalOriginalEmails}`);
    console.log(`   📤 Sent: ${result.summary.sent}`);
    console.log(`   ✅ Delivered: ${result.summary.delivered}`);
    console.log(`   👁️ Opened: ${result.summary.opened}`);
    console.log(`   🔗 Clicked: ${result.summary.clicked}`);
    console.log(`   ❌ Bounced: ${result.summary.bounced}`);
    console.log(`   ❓ Missed: ${result.summary.missed}`);
    console.log(`   📡 Resend API emails: ${result.summary.resendApiEmailsFound}`);
    console.log(`   🗄️ Local events: ${result.summary.localEventsFound}`);
    console.log(`   📈 Delivery rate: ${result.summary.deliveryRate}%`);
    console.log(`   📈 Open rate: ${result.summary.openRate}%`);

    console.log(`✅ [ANALYZE_DIRECT_EMAILS] Analysis complete: ${result.summary.missed} missed emails out of ${originalEmailList.length} total`);

    res.json(result);
  } catch (error) {
    console.error('❌ [ANALYZE_DIRECT_EMAILS] Error analyzing direct emails:', error);
    console.error('❌ [ANALYZE_DIRECT_EMAILS] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to analyze direct emails', details: error.message });
  }
};

/**
 * POST /marketing/resend-direct-missed
 * Resend missed emails from direct Resend sends
 */
exports.resendDirectMissed = async (req, res) => {
  try {
    const { 
      originalEmailList, 
      subject, 
      bodyHtml, 
      tenant_id,
      startDate,
      endDate,
      batchSize = 100,
      delayBetweenBatches = 1000
    } = req.body;

    if (!originalEmailList || !subject || !bodyHtml || !tenant_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`🔄 Starting resend for direct emails: ${originalEmailList.length} original emails`);

    // First, analyze to find missed emails
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get email events for the given email addresses in the date range
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        recipient: { in: originalEmailList },
        createdAt: {
          gte: startDateObj,
          lte: endDateObj
        }
      }
    });

    // Group events by recipient
    const eventsByRecipient = {};
    emailEvents.forEach(event => {
      if (!eventsByRecipient[event.recipient]) {
        eventsByRecipient[event.recipient] = [];
      }
      eventsByRecipient[event.recipient].push(event);
    });

    // Find missed emails (no events found)
    const missedEmails = originalEmailList.filter(email => {
      const events = eventsByRecipient[email] || [];
      return events.length === 0;
    });

    console.log(`📧 Found ${missedEmails.length} missed emails to resend`);

    if (missedEmails.length === 0) {
      return res.status(400).json({ 
        error: 'No missed emails found to resend',
        message: 'All emails in the original list appear to have been sent successfully'
      });
    }

    // Filter out bounced emails
    const { validEmails, bouncedEmails } = await filterBouncedEmails(missedEmails);
    
    console.log(`✅ After bounce filtering: ${validEmails.length} valid, ${bouncedEmails.length} bounced`);

    if (validEmails.length === 0) {
      return res.status(400).json({ 
        error: 'No valid emails to resend',
        message: 'All missed emails are either bounced or invalid'
      });
    }

    // Create a new campaign record for the resend
    const campaignRecord = await prisma.campaign.create({
      data: {
        name: `Resend: ${subject} (Direct Email Recovery)`,
        subject,
        bodyHtml,
        recipients: validEmails,
        tenant_id,
      },
    });

    console.log(`📝 Created resend campaign: ${campaignRecord.id}`);

    // Send emails using batched processing
    const emailResults = await sendBulkMarketingEmailBatched({
      toEmails: validEmails,
      subject,
      bodyHtml,
      campaignId: campaignRecord.id,
      tenant_id,
      batchSize,
      delayBetweenBatches
    });

    // Update campaign with results
    const successCount = emailResults.results.length;
    const failureCount = emailResults.errors.length;

    await prisma.campaign.update({
      where: { id: campaignRecord.id },
      data: {
        name: `Resend: ${subject} (${successCount} sent, ${failureCount} failed)`,
      },
    });

    console.log(`✅ Direct email resend completed: ${successCount} sent, ${failureCount} failed`);

    res.status(200).json({
      message: 'Direct email resend completed successfully!',
      campaign: campaignRecord,
      summary: {
        originalEmails: originalEmailList.length,
        missedEmails: missedEmails.length,
        validEmails: validEmails.length,
        bouncedEmails: bouncedEmails.length,
        sentSuccessfully: successCount,
        failedToSend: failureCount,
        successRate: ((successCount / validEmails.length) * 100).toFixed(2) + '%'
      },
      emailResults
    });

  } catch (err) {
    console.error('❌ resendDirectMissed error:', err);
    res.status(500).json({ error: 'Failed to resend direct missed emails' });
  }
};

/**
 * POST /marketing/fetch-email-details
 * Fetch detailed status of specific emails by their Resend IDs
 */
exports.fetchEmailDetails = async (req, res) => {
  const startTime = Date.now();
  console.log(`[Marketing] 🚀 fetchEmailDetails called at ${new Date().toISOString()}`);
  
  try {
    const { emailIds, delayMs = 1000 } = req.body;

    console.log(`[Marketing] 📥 Request body:`, JSON.stringify(req.body, null, 2));

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      console.error(`[Marketing] ❌ Invalid request: emailIds must be a non-empty array`);
      return res.status(400).json({ error: 'emailIds must be a non-empty array of email IDs' });
    }

    console.log(`[Marketing] 🔍 Fetching details for ${emailIds.length} emails from Resend.com`);
    console.log(`[Marketing] ⏱️ Delay setting: ${delayMs}ms`);
    console.log(`[Marketing] 📋 Email IDs:`, emailIds);

    // Fetch email details with rate limiting
    console.log(`[Marketing] 📡 Calling fetchEmailsByIds...`);
    const { results, errors } = await fetchEmailsByIds(emailIds, delayMs);

    console.log(`[Marketing] 📊 fetchEmailsByIds completed:`);
    console.log(`   - Results count: ${results.length}`);
    console.log(`   - Errors count: ${errors.length}`);

    // Process results to extract relevant information
    console.log(`[Marketing] 🔧 Processing email results...`);
    const emailDetails = results.map(email => {
      const processed = {
        id: email.id,
        to: email.to,
        from: email.from,
        subject: email.subject,
        createdAt: email.created_at,
        lastEvent: email.last_event,
        status: email.last_event || 'unknown'
      };
      console.log(`[Marketing] 📧 Processed email: ${email.id} -> ${processed.status}`);
      return processed;
    });

    const totalDuration = Date.now() - startTime;
    console.log(`[Marketing] ✅ Successfully fetched ${results.length} emails, ${errors.length} failed`);
    console.log(`[Marketing] ⏱️ Total processing time: ${totalDuration}ms`);

    const response = {
      message: 'Email details fetched successfully',
      summary: {
        requested: emailIds.length,
        successful: results.length,
        failed: errors.length,
        processingTimeMs: totalDuration
      },
      emails: emailDetails,
      errors: errors
    };

    console.log(`[Marketing] 📤 Sending response:`, JSON.stringify(response.summary, null, 2));
    res.status(200).json(response);

  } catch (err) {
    const totalDuration = Date.now() - startTime;
    console.error(`[Marketing] ❌ fetchEmailDetails error (${totalDuration}ms):`, err);
    console.error(`[Marketing] 🚨 Error stack:`, err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch email details', 
      details: err.message,
      processingTimeMs: totalDuration
    });
  }
};