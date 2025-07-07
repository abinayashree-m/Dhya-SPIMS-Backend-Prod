const axios = require('axios');

const BASE_URL = 'https://dhya-spims-backend-prod.onrender.com';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('❌ API_KEY environment variable is required');
  process.exit(1);
}

const headers = {
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

async function testContactLookup() {
  console.log('\n🔍 === TESTING CONTACT LOOKUP (SMART TENANT DETECTION) ===');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/growth/contacts/find-by-email?email=contact@example.com`,
      { headers }
    );
    
    console.log('✅ Contact lookup successful:', {
      status: response.status,
      tenantId: response.data.tenantId,
      contactFound: !!response.data.contact,
      contactName: response.data.contact?.name,
      campaignName: response.data.contact?.campaign?.name
    });
    
    return response.data.tenantId; // Return for use in other tests
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️ Contact not found (expected for test data)');
      return null;
    } else {
      console.error('❌ Contact lookup failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      return null;
    }
  }
}

async function testValidReply() {
  console.log('\n📧 === TESTING VALID REPLY PROCESSING ===');
  
  try {
    const requestData = {
      senderEmail: 'contact@example.com',
      subject: 'Re: Partnership Opportunity',
      tenantId: 'test-tenant-id'
    };
    
    const response = await axios.post(
      `${BASE_URL}/api/growth/tasks/create-from-reply`,
      requestData,
      { headers }
    );
    
    console.log('✅ Valid reply processing successful:', {
      status: response.status,
      taskId: response.data.task?.id,
      priority: response.data.task?.priority,
      contactName: response.data.contact?.name
    });
    
  } catch (error) {
    console.error('❌ Valid reply processing failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
  }
}

async function testNonTrackedContact() {
  console.log('\n👤 === TESTING NON-TRACKED CONTACT ===');
  
  try {
    const requestData = {
      senderEmail: 'unknown@randomcompany.com',
      subject: 'Random email',
      tenantId: 'test-tenant-id'
    };
    
    const response = await axios.post(
      `${BASE_URL}/api/growth/tasks/create-from-reply`,
      requestData,
      { headers }
    );
    
    console.log('ℹ️ Non-tracked contact response:', {
      status: response.status,
      message: response.data.message
    });
    
  } catch (error) {
    console.error('❌ Non-tracked contact test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
  }
}

async function testInvalidRequest() {
  console.log('\n⚠️ === TESTING INVALID REQUEST ===');
  
  try {
    const requestData = {
      senderEmail: '', // Missing email
      subject: 'Test subject'
      // Missing tenantId
    };
    
    const response = await axios.post(
      `${BASE_URL}/api/growth/tasks/create-from-reply`,
      requestData,
      { headers }
    );
    
    console.log('❌ Invalid request unexpectedly succeeded:', response.data);
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid request properly rejected:', {
        status: error.response.status,
        message: error.response.data.message
      });
    } else {
      console.error('❌ Unexpected error for invalid request:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
  }
}

async function runAllTests() {
  console.log('🚀 === STARTING REPLY PROCESSING TESTS ===');
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log(`🔑 API Key: ${API_KEY ? '✓ Present' : '✗ Missing'}`);
  
  await testContactLookup();
  await testValidReply();
  await testNonTrackedContact();
  await testInvalidRequest();
  
  console.log('\n🎯 === ALL TESTS COMPLETED ===');
  console.log('Check the logs above for test results');
}

runAllTests().catch(console.error); 