const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;
const TENANT_ID = process.env.TENANT_ID;

async function testReplyProcessing() {
  console.log('🧪 Testing Reply Processing Endpoint...');
  console.log('🔧 API Base URL:', API_BASE_URL);
  console.log('🔧 Tenant ID:', TENANT_ID);
  console.log('🔧 API Key:', API_KEY ? `...${API_KEY.slice(-6)}` : 'Not set');

  try {
    // Test 1: Valid reply from tracked contact
    console.log('\n📧 Test 1: Valid reply from tracked contact');
    const validReplyResponse = await axios.post(
      `${API_BASE_URL}/api/growth/tasks/create-from-reply`,
      {
        senderEmail: 'test@example.com',
        subject: 'Re: Partnership Opportunity',
        tenantId: TENANT_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Valid reply test - Status:', validReplyResponse.status);
    console.log('✅ Valid reply test - Response:', validReplyResponse.data);

    // Test 2: Reply from non-tracked contact
    console.log('\n📧 Test 2: Reply from non-tracked contact');
    const unknownReplyResponse = await axios.post(
      `${API_BASE_URL}/api/growth/tasks/create-from-reply`,
      {
        senderEmail: 'unknown@example.com',
        subject: 'Re: Random Email',
        tenantId: TENANT_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('📋 Unknown contact test - Status:', unknownReplyResponse.status);
    console.log('📋 Unknown contact test - Response:', unknownReplyResponse.data);

    // Test 3: Invalid request (missing fields)
    console.log('\n📧 Test 3: Invalid request (missing fields)');
    try {
      await axios.post(
        `${API_BASE_URL}/api/growth/tasks/create-from-reply`,
        {
          senderEmail: 'test@example.com',
          // Missing subject and tenantId
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.log('❌ Invalid request test - Status:', error.response?.status);
      console.log('❌ Invalid request test - Response:', error.response?.data);
    }

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    }
  }
}

// Run the test
testReplyProcessing(); 