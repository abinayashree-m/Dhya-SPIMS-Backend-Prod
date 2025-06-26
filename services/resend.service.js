const axios = require('axios');

const RESEND_API_KEY = process.env.RESEND_API_KEY; // Store this in your .env file

console.log('[Resend] RESEND_API_KEY present:', !!RESEND_API_KEY);
console.log('[Resend] API Key length:', RESEND_API_KEY ? RESEND_API_KEY.length : 0);

const resendApi = axios.create({
  baseURL: 'https://api.resend.com',
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch a single email by ID from Resend.com
 * @param {string} emailId - The email ID from Resend
 * @returns {Promise<Object>} Email details
 */
async function fetchEmailById(emailId) {
  const startTime = Date.now();
  console.log(`[Resend] 🔍 Fetching email by ID: ${emailId}`);
  console.log(`[Resend] 📡 Request URL: GET /emails/${emailId}`);
  
  try {
    const response = await resendApi.get(`/emails/${emailId}`);
    const duration = Date.now() - startTime;
    
    console.log(`[Resend] ✅ Email fetch successful (${duration}ms)`);
    console.log(`[Resend] 📊 Response status: ${response.status}`);
    console.log(`[Resend] 📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    // Log key email details
    if (response.data) {
      console.log(`[Resend] 📧 Email Details:`);
      console.log(`   - ID: ${response.data.id}`);
      console.log(`   - To: ${response.data.to}`);
      console.log(`   - From: ${response.data.from}`);
      console.log(`   - Subject: ${response.data.subject}`);
      console.log(`   - Created: ${response.data.created_at}`);
      console.log(`   - Last Event: ${response.data.last_event}`);
    }
    
    return response.data;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Resend] ❌ Email fetch failed (${duration}ms):`, err.message);
    
    if (err.response) {
      console.error(`[Resend] 🚨 API Error Details:`);
      console.error(`   - Status: ${err.response.status}`);
      console.error(`   - Status Text: ${err.response.statusText}`);
      console.error(`   - Error Data:`, JSON.stringify(err.response.data, null, 2));
      console.error(`   - Headers:`, JSON.stringify(err.response.headers, null, 2));
    } else if (err.request) {
      console.error(`[Resend] 🌐 Network Error:`);
      console.error(`   - Request made but no response received`);
      console.error(`   - Error:`, err.message);
    } else {
      console.error(`[Resend] ⚠️ Other Error:`);
      console.error(`   - Error:`, err.message);
    }
    
    throw err;
  }
}

/**
 * Fetch multiple emails by their IDs (with rate limiting)
 * @param {Array<string>} emailIds - Array of email IDs
 * @param {number} delayMs - Delay between requests (default: 1000ms for 1 per second)
 * @returns {Promise<Array>} Array of email details
 */
async function fetchEmailsByIds(emailIds, delayMs = 1000) {
  const startTime = Date.now();
  console.log(`[Resend] 🚀 Starting batch fetch of ${emailIds.length} emails`);
  console.log(`[Resend] ⏱️ Delay between requests: ${delayMs}ms`);
  console.log(`[Resend] 📋 Email IDs:`, emailIds);
  
  const results = [];
  const errors = [];

  for (let i = 0; i < emailIds.length; i++) {
    const emailId = emailIds[i];
    const requestStartTime = Date.now();
    
    console.log(`[Resend] 📤 Request ${i + 1}/${emailIds.length}: ${emailId}`);
    
    try {
      const emailDetails = await fetchEmailById(emailId);
      const requestDuration = Date.now() - requestStartTime;
      
      results.push(emailDetails);
      console.log(`[Resend] ✅ Success ${i + 1}/${emailIds.length} (${requestDuration}ms): ${emailId}`);
    } catch (err) {
      const requestDuration = Date.now() - requestStartTime;
      console.error(`[Resend] ❌ Failed ${i + 1}/${emailIds.length} (${requestDuration}ms): ${emailId}`);
      console.error(`[Resend] 🚨 Error:`, err.message);
      errors.push({ emailId, error: err.message, duration: requestDuration });
    }

    // Add delay between requests (except for the last one)
    if (i < emailIds.length - 1) {
      console.log(`[Resend] ⏳ Waiting ${delayMs}ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[Resend] 🎯 Batch fetch completed (${totalDuration}ms)`);
  console.log(`[Resend] 📊 Summary:`);
  console.log(`   - Total requests: ${emailIds.length}`);
  console.log(`   - Successful: ${results.length}`);
  console.log(`   - Failed: ${errors.length}`);
  console.log(`   - Success rate: ${((results.length / emailIds.length) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log(`[Resend] ❌ Failed emails:`, errors.map(e => e.emailId));
  }

  return { results, errors };
}

/**
 * Fetch emails by date range from Resend.com
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @param {number} limit - Number of emails to fetch (max 100)
 * @returns {Promise<Array>} Array of email details
 */
async function fetchEmailsByDateRange(startDate, endDate, limit = 100) {
  const startTime = Date.now();
  console.log(`[Resend] 🔍 Fetching emails by date range: ${startDate} to ${endDate}`);
  console.log(`[Resend] 📡 Request URL: GET /emails`);
  
  try {
    // Try to fetch all emails first (Resend API might not support date filtering directly)
    const response = await resendApi.get('/emails', {
      params: {
        limit: limit
      }
    });
    const duration = Date.now() - startTime;
    
    console.log(`[Resend] ✅ Emails fetch successful (${duration}ms)`);
    console.log(`[Resend] 📊 Response status: ${response.status}`);
    console.log(`[Resend] 📄 Found ${response.data?.data?.length || 0} total emails`);
    
    // Filter emails by date range on our side
    let filteredEmails = [];
    if (response.data?.data) {
      filteredEmails = response.data.data.filter(email => {
        const emailDate = new Date(email.created_at);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return emailDate >= start && emailDate <= end;
      });
    }
    
    console.log(`[Resend] 📊 Filtered to ${filteredEmails.length} emails in date range`);
    
    // Log sample emails for debugging
    if (filteredEmails.length > 0) {
      console.log(`[Resend] 📋 Sample emails:`);
      filteredEmails.slice(0, 3).forEach((email, index) => {
        console.log(`   ${index + 1}. ID: ${email.id}, To: ${email.to}, Subject: ${email.subject?.substring(0, 50)}..., Created: ${email.created_at}, Last Event: ${email.last_event}`);
      });
      if (filteredEmails.length > 3) {
        console.log(`   ... and ${filteredEmails.length - 3} more emails`);
      }
    }
    
    return filteredEmails;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Resend] ❌ Emails fetch failed (${duration}ms):`, err.message);
    
    if (err.response) {
      console.error(`[Resend] 🚨 API Error Details:`);
      console.error(`   - Status: ${err.response.status}`);
      console.error(`   - Status Text: ${err.response.statusText}`);
      console.error(`   - Error Data:`, JSON.stringify(err.response.data, null, 2));
    } else if (err.request) {
      console.error(`[Resend] 🌐 Network Error:`, err.message);
    } else {
      console.error(`[Resend] ⚠️ Other Error:`, err.message);
    }
    
    throw err;
  }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use fetchEmailById or fetchEmailsByIds instead
 */
async function fetchResendEvents({ from, to, startDate, endDate }) {
  console.warn('[Resend] ⚠️ fetchResendEvents is deprecated. Use fetchEmailById or fetchEmailsByIds instead.');
  console.log('[Resend] 📝 Called with params:', { from, to, startDate, endDate });
  return [];
}

module.exports = { 
  fetchEmailById, 
  fetchEmailsByIds, 
  fetchEmailsByDateRange,
  fetchResendEvents // Keep for backward compatibility
}; 