const axios = require('axios');
require('dotenv').config();

/**
 * 🧪 TEST N8N REPLYDRAFTIR WEBHOOK
 * This script tests the n8n ReplyDrafter webhook to diagnose timeout issues
 */

const N8N_WEBHOOK_URL = process.env.N8N_REPLY_DRAFTER_WEBHOOK_URL;

console.log('🧪 [TEST] === N8N WEBHOOK TEST STARTED ===');
console.log('🔗 [TEST] Webhook URL:', N8N_WEBHOOK_URL || 'NOT CONFIGURED');

if (!N8N_WEBHOOK_URL) {
  console.error('❌ [TEST] N8N_REPLY_DRAFTER_WEBHOOK_URL not configured in .env');
  console.error('❌ [TEST] Add this to your .env file:');
  console.error('N8N_REPLY_DRAFTER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id');
  process.exit(1);
}

// Test data payload
const testPayload = {
  taskId: "test-task-" + Date.now(),
  contactName: "John Smith",
  contactEmail: "john@testcompany.com",
  companyName: "Test Company Inc",
  campaignName: "Test Campaign",
  originalEmail: {
    id: "test-email-123",
    subject: "Partnership Opportunity with Your Company",
    body: `Hi John,

I hope this email finds you well. We are NSC Spinning Mills, a textile manufacturing company specializing in premium cotton and synthetic fiber blends.

We noticed your company's focus on sustainable fashion and would love to explore potential partnership opportunities. Our advanced yarn technologies and sustainable certifications might align well with your product development goals.

Would you be interested in learning more about our capabilities?

Best regards`
  },
  replyText: "Thank you for reaching out! We are definitely interested in learning more about your textile capabilities. Could you send us some information about your product catalog and pricing? Also, do you have any sustainability certifications?",
  companyPersona: {
    id: "test-persona-123",
    summary: "NSC Spinning Mills is a leading textile manufacturing company with over 20 years of experience in producing high-quality cotton and synthetic fiber blends. We specialize in sustainable manufacturing processes and serve clients across the fashion and home textiles industries. Our certifications include GOTS, GRS, and BCI."
  }
};

async function testWebhook() {
  console.log('📤 [TEST] Sending test payload to n8n webhook...');
  console.log('📋 [TEST] Test data:', {
    taskId: testPayload.taskId,
    contactName: testPayload.contactName,
    hasOriginalEmail: !!testPayload.originalEmail.body,
    hasReplyText: !!testPayload.replyText,
    hasPersona: !!testPayload.companyPersona.summary
  });

  const startTime = Date.now();

  try {
    console.log('⏱️ [TEST] Starting request at:', new Date().toISOString());
    
    const response = await axios.post(N8N_WEBHOOK_URL, testPayload, {
      timeout: 60000, // 60 second timeout for testing
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ [TEST] === WEBHOOK TEST SUCCESS ===');
    console.log('⏱️ [TEST] Response time:', duration + 'ms');
    console.log('📊 [TEST] Status code:', response.status);
    console.log('📝 [TEST] Response data:', {
      hasReply: !!response.data?.reply,
      hasTaskId: !!response.data?.taskId,
      replyLength: response.data?.reply?.length || 0,
      fullResponse: response.data
    });

    if (response.data?.reply) {
      console.log('🤖 [TEST] Generated AI Reply:');
      console.log('=' .repeat(50));
      console.log(response.data.reply);
      console.log('=' .repeat(50));
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error('❌ [TEST] === WEBHOOK TEST FAILED ===');
    console.error('⏱️ [TEST] Failed after:', duration + 'ms');
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ [TEST] TIMEOUT ERROR - Webhook took longer than 60 seconds');
      console.error('🔍 [TEST] Possible causes:');
      console.error('   1. n8n workflow is not active');
      console.error('   2. Google Gemini API is slow/unavailable'); 
      console.error('   3. Workflow has an error');
      console.error('   4. Network connectivity issues');
    } else if (error.response) {
      console.error('📊 [TEST] HTTP Error:', error.response.status);
      console.error('📝 [TEST] Error response:', error.response.data);
    } else if (error.request) {
      console.error('🌐 [TEST] Network Error - No response received');
      console.error('🔍 [TEST] Check if webhook URL is correct and n8n is accessible');
    } else {
      console.error('❓ [TEST] Unknown Error:', error.message);
    }
    
    console.error('🔧 [TEST] Full error:', error);
  }
}

// Simple connectivity test
async function testConnectivity() {
  console.log('🔌 [TEST] Testing basic connectivity to webhook URL...');
  
  try {
    // Try a simple GET request to test connectivity
    const urlBase = N8N_WEBHOOK_URL.split('/webhook/')[0];
    console.log('🌐 [TEST] Testing base URL:', urlBase);
    
    const response = await axios.get(urlBase, { 
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log('✅ [TEST] Basic connectivity OK - Status:', response.status);
    
  } catch (error) {
    console.error('❌ [TEST] Basic connectivity failed:', error.message);
    console.error('🔍 [TEST] This suggests network/DNS issues with n8n instance');
  }
}

// Run tests
async function runTests() {
  await testConnectivity();
  console.log(''); // spacing
  await testWebhook();
  
  console.log('');
  console.log('🧪 [TEST] === TEST COMPLETED ===');
  console.log('💡 [TEST] Next steps:');
  console.log('   1. Check your n8n instance dashboard');
  console.log('   2. Verify the ReplyDrafter workflow is active');
  console.log('   3. Check Google Gemini API credentials');
  console.log('   4. Review n8n execution logs for errors');
}

runTests(); 