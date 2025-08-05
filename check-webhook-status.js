const { prisma } = require('./prisma/client');
require('dotenv').config();

async function checkWebhookStatus() {
  console.log('🔍 [WEBHOOK] === WEBHOOK STATUS CHECK ===');
  
  try {
    // 1. Check if webhook secret is configured
    console.log('🔍 [WEBHOOK] Checking webhook configuration...');
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ [WEBHOOK] RESEND_WEBHOOK_SECRET is not configured!');
      console.log('💡 [WEBHOOK] Add RESEND_WEBHOOK_SECRET to your .env file');
      console.log('💡 [WEBHOOK] You can get this from your Resend dashboard under Webhooks');
    } else {
      console.log('✅ [WEBHOOK] RESEND_WEBHOOK_SECRET is configured');
    }

    // 2. Check database for email events
    console.log('🔍 [WEBHOOK] Checking email events in database...');
    const totalEvents = await prisma.emailEvent.count();
    console.log(`📊 [WEBHOOK] Total email events in database: ${totalEvents}`);

    if (totalEvents === 0) {
      console.log('⚠️ [WEBHOOK] No email events found in database');
      console.log('💡 [WEBHOOK] This could mean:');
      console.log('   - Webhooks are not configured in Resend');
      console.log('   - Webhook endpoint is not accessible');
      console.log('   - Emails are not being sent with tracking');
    } else {
      // Show recent events
      const recentEvents = await prisma.emailEvent.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          eventType: true,
          recipient: true,
          createdAt: true,
          campaignId: true
        }
      });

      console.log('📊 [WEBHOOK] Recent email events:');
      recentEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.eventType} - ${event.recipient} (${event.createdAt.toISOString()})`);
      });
    }

    // 3. Check campaigns
    console.log('🔍 [WEBHOOK] Checking campaigns...');
    const totalCampaigns = await prisma.campaign.count();
    console.log(`📊 [WEBHOOK] Total campaigns: ${totalCampaigns}`);

    if (totalCampaigns > 0) {
      const campaignsWithEvents = await prisma.campaign.findMany({
        include: {
          _count: {
            select: { emailEvents: true }
          }
        }
      });

      console.log('📊 [WEBHOOK] Campaign event counts:');
      campaignsWithEvents.forEach(campaign => {
        console.log(`   - ${campaign.name}: ${campaign._count.emailEvents} events`);
      });
    }

    // 4. Check webhook endpoint accessibility
    console.log('🔍 [WEBHOOK] Webhook endpoint should be accessible at:');
    console.log(`   POST ${process.env.BASE_URL || 'http://localhost:5001'}/webhooks/resend`);
    console.log('💡 [WEBHOOK] Make sure this URL is configured in your Resend webhook settings');

    // 5. Provide setup instructions
    console.log('\n📋 [WEBHOOK] === SETUP INSTRUCTIONS ===');
    console.log('1. Go to your Resend dashboard');
    console.log('2. Navigate to Settings > Webhooks');
    console.log('3. Add a new webhook with these settings:');
    console.log(`   - URL: ${process.env.BASE_URL || 'http://localhost:5001'}/webhooks/resend`);
    console.log('   - Events: Select all email events (sent, delivered, opened, clicked, bounced)');
    console.log('4. Copy the webhook secret and add it to your .env file as RESEND_WEBHOOK_SECRET');
    console.log('5. Test the webhook by sending a test email');

    console.log('\n✅ [WEBHOOK] === WEBHOOK STATUS CHECK COMPLETE ===');

  } catch (error) {
    console.error('❌ [WEBHOOK] Error checking webhook status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkWebhookStatus()
  .then(() => {
    console.log('🎉 Webhook status check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Webhook status check failed:', error);
    process.exit(1);
  }); 