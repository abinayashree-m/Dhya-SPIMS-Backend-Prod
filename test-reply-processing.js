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
    // Test 1: Tenant lookup by user email
    console.log('\n🏢 Test 1: Tenant lookup by user email');
    const tenantLookupResponse = await axios.get(
      `${API_BASE_URL}/api/growth/tenants/find-by-user-email?email=dharsan@dhya.com`,
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Tenant lookup test - Status:', tenantLookupResponse.status);
    console.log('✅ Tenant lookup test - Response:', tenantLookupResponse.data);
    
    const foundTenantId = tenantLookupResponse.data.tenantId;

    // Test 2: Contact lookup with query parameters
    console.log('\n🔍 Test 2: Contact lookup with query parameters');
    const contactLookupResponse = await axios.get(
      `${API_BASE_URL}/api/growth/contacts/find-by-email?email=test@example.com&tenantId=${foundTenantId || TENANT_ID}`,
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('🔍 Contact lookup test - Status:', contactLookupResponse.status);
    console.log('🔍 Contact lookup test - Response:', contactLookupResponse.data);

    // Test 3: Valid reply from tracked contact
    console.log('\n📧 Test 3: Valid reply from tracked contact');
    const validReplyResponse = await axios.post(
      `${API_BASE_URL}/api/growth/tasks/create-from-reply`,
      {
        senderEmail: 'test@example.com',
        subject: 'Re: Partnership Opportunity',
        tenantId: foundTenantId || TENANT_ID
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Valid reply test - Status:', validReplyResponse.status);
    console.log('✅ Valid reply test - Response:', validReplyResponse.data);

    // Test 4: Reply from non-tracked contact
    console.log('\n📧 Test 4: Reply from non-tracked contact');
    const unknownReplyResponse = await axios.post(
      `${API_BASE_URL}/api/growth/tasks/create-from-reply`,
      {
        senderEmail: 'unknown@example.com',
        subject: 'Re: Random Email',
        tenantId: foundTenantId || TENANT_ID
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('📋 Unknown contact test - Status:', unknownReplyResponse.status);
    console.log('📋 Unknown contact test - Response:', unknownReplyResponse.data);

    // Test 5: Invalid request (missing fields)
    console.log('\n📧 Test 5: Invalid request (missing fields)');
    try {
      await axios.post(
        `${API_BASE_URL}/api/growth/tasks/create-from-reply`,
        {
          senderEmail: 'test@example.com',
          // Missing subject and tenantId
        },
        {
          headers: {
            'x-api-key': API_KEY,
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