const { PrismaClient } = require('@prisma/client');
const { sendBulkMarketingEmail, filterBouncedEmails } = require('../utils/email');

const prisma = new PrismaClient();

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