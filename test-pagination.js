const axios = require('axios');

// Test pagination for purchase orders
async function testPagination() {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('🧪 Testing Purchase Orders Pagination...\n');
    
    // Test 1: Basic pagination
    console.log('📄 Test 1: Basic pagination (page=1, limit=5)');
    const response1 = await axios.get(`${baseURL}/api/purchase-orders?page=1&limit=5`);
    console.log('✅ Response structure:', {
      hasData: !!response1.data.data,
      hasPagination: !!response1.data.pagination,
      dataLength: response1.data.data?.length || 0,
      pagination: response1.data.pagination
    });
    
    // Test 2: Search functionality
    console.log('\n🔍 Test 2: Search functionality');
    const response2 = await axios.get(`${baseURL}/api/purchase-orders?search=test&page=1&limit=10`);
    console.log('✅ Search response:', {
      dataLength: response2.data.data?.length || 0,
      total: response2.data.pagination?.total || 0
    });
    
    // Test 3: Status filter
    console.log('\n🏷️ Test 3: Status filter');
    const response3 = await axios.get(`${baseURL}/api/purchase-orders?status=uploaded&page=1&limit=10`);
    console.log('✅ Status filter response:', {
      dataLength: response3.data.data?.length || 0,
      total: response3.data.pagination?.total || 0
    });
    
    // Test 4: Sorting
    console.log('\n📊 Test 4: Sorting');
    const response4 = await axios.get(`${baseURL}/api/purchase-orders?sortBy=poNumber&sortOrder=asc&page=1&limit=10`);
    console.log('✅ Sort response:', {
      dataLength: response4.data.data?.length || 0,
      sortBy: 'poNumber',
      sortOrder: 'asc'
    });
    
    console.log('\n🎉 All pagination tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPagination(); 