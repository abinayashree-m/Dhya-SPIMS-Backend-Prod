const { PrismaClient } = require('@prisma/client');
const { sendBulkMarketingEmail } = require('../utils/email');

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

    // ✅ 1. Send emails
    await sendBulkMarketingEmail({
      toEmails,
      subject,
      bodyHtml,
      tenant_id,
    });

    // ✅ 2. Save campaign in DB
    const campaignRecord = await prisma.campaign.create({
      data: {
        name: subject,
        subject,
        bodyHtml,
        recipients: toEmails,
        tenant_id,
      },
    });

    res.status(200).json({
      message: 'Emails sent successfully!',
      campaign: campaignRecord,
    });
  } catch (err) {
    console.error('❌ sendBulkEmail error:', err);
    res.status(500).json({ error: 'Failed to send emails' });
  }
};

/**
 * GET /marketing/campaigns
 * Retrieve all past campaigns
 */
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json(campaigns);
  } catch (err) {
    console.error('❌ getCampaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};