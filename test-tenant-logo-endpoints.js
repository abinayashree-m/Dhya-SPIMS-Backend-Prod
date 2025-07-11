const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-jwt-token-here';

// Sample base64 image data (small 1x1 PNG)
const SAMPLE_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const axiosConfig = {
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

async function testTenantLogoEndpoints() {
  console.log('🚀 Testing Tenant Logo Endpoints');
  console.log('=====================================\n');

  try {
    // Test 1: Get all tenants (should not include logos)
    console.log('1. Testing GET /tenants (should not include logos)');
    try {
      const response = await axios.get(`${BASE_URL}/tenants`, axiosConfig);
      console.log('✅ Status:', response.status);
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.length > 0) {
        const firstTenant = response.data[0];
        if (firstTenant.logo === undefined) {
          console.log('✅ Logos correctly excluded from list view');
        } else {
          console.log('⚠️  Warning: Logo included in list view (may impact performance)');
        }
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 2: Get tenant by ID (should not include logo)
    console.log('2. Testing GET /tenants/:id (should not include logo)');
    try {
      // First get a tenant ID from the list
      const tenantsResponse = await axios.get(`${BASE_URL}/tenants`, axiosConfig);
      if (tenantsResponse.data.length === 0) {
        console.log('⚠️  No tenants found, skipping individual tenant tests');
        return;
      }

      const tenantId = tenantsResponse.data[0].id;
      const response = await axios.get(`${BASE_URL}/tenants/${tenantId}`, axiosConfig);
      console.log('✅ Status:', response.status);
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.logo === undefined) {
        console.log('✅ Logo correctly excluded from basic view');
      } else {
        console.log('⚠️  Warning: Logo included in basic view');
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 3: Get tenant details (should include logo)
    console.log('3. Testing GET /tenants/:id/details (should include logo)');
    try {
      const tenantsResponse = await axios.get(`${BASE_URL}/tenants`, axiosConfig);
      const tenantId = tenantsResponse.data[0].id;
      
      const response = await axios.get(`${BASE_URL}/tenants/${tenantId}/details`, axiosConfig);
      console.log('✅ Status:', response.status);
      console.log('📊 Response keys:', Object.keys(response.data));
      
      if (response.data.logo !== undefined) {
        console.log('✅ Logo field included in details view');
        console.log('🖼️  Logo data type:', typeof response.data.logo);
        if (response.data.logo) {
          console.log('🖼️  Logo data length:', response.data.logo.length);
        } else {
          console.log('🖼️  Logo is null (no logo set)');
        }
      } else {
        console.log('❌ Logo field missing from details view');
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 4: Update tenant logo
    console.log('4. Testing PUT /tenants/:id/logo');
    try {
      const tenantsResponse = await axios.get(`${BASE_URL}/tenants`, axiosConfig);
      const tenantId = tenantsResponse.data[0].id;
      
      const response = await axios.put(
        `${BASE_URL}/tenants/${tenantId}/logo`,
        { logo: SAMPLE_LOGO },
        axiosConfig
      );
      console.log('✅ Status:', response.status);
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.message && response.data.tenant) {
        console.log('✅ Logo update successful');
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 5: Verify logo was saved by fetching details again
    console.log('5. Testing logo persistence (GET details after update)');
    try {
      const tenantsResponse = await axios.get(`${BASE_URL}/tenants`, axiosConfig);
      const tenantId = tenantsResponse.data[0].id;
      
      const response = await axios.get(`${BASE_URL}/tenants/${tenantId}/details`, axiosConfig);
      console.log('✅ Status:', response.status);
      
      if (response.data.logo && response.data.logo.length > 0) {
        console.log('✅ Logo successfully persisted');
        console.log('🖼️  Logo data length:', response.data.logo.length);
        console.log('🖼️  Logo starts with:', response.data.logo.substring(0, 50) + '...');
      } else {
        console.log('❌ Logo not persisted or empty');
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 6: Test error cases
    console.log('6. Testing error cases');
    
    // Test invalid tenant ID
    try {
      console.log('   6a. Testing invalid tenant ID');
      await axios.get(`${BASE_URL}/tenants/invalid-id/details`, axiosConfig);
      console.log('❌ Should have failed with invalid ID');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly handles invalid tenant ID (404)');
      } else {
        console.log('⚠️  Unexpected error for invalid ID:', error.response?.status);
      }
    }

    // Test missing logo data
    try {
      console.log('   6b. Testing missing logo data');
      const tenantsResponse = await axios.get(`${BASE_URL}/tenants`, axiosConfig);
      const tenantId = tenantsResponse.data[0].id;
      
      await axios.put(
        `${BASE_URL}/tenants/${tenantId}/logo`,
        {}, // Missing logo field
        axiosConfig
      );
      console.log('❌ Should have failed with missing logo');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly handles missing logo data (400)');
      } else {
        console.log('⚠️  Unexpected error for missing logo:', error.response?.status);
      }
    }

    console.log('\n🎉 Tenant logo endpoints testing complete!');

  } catch (error) {
    console.error('💥 Fatal error during testing:', error.message);
  }
}

// Show usage if no token provided
if (!process.env.TEST_TOKEN && TEST_TOKEN === 'your-jwt-token-here') {
  console.log('🔐 Usage: TEST_TOKEN=your-jwt-token node test-tenant-logo-endpoints.js');
  console.log('📖 Or: API_BASE_URL=http://localhost:3000/api TEST_TOKEN=token node test-tenant-logo-endpoints.js');
  process.exit(1);
}

// Run tests
testTenantLogoEndpoints(); 