const axios = require('axios');

const RESEND_API_KEY = process.env.RESEND_API_KEY; // Store this in your .env file

console.log('[Resend] RESEND_API_KEY present:', !!RESEND_API_KEY);

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
  console.log('[Resend] Fetching email by ID:', emailId);
  try {
    const response = await resendApi.get(`/emails/${emailId}`);
    console.log('[Resend] Email details response status:', response.status);
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error('[Resend] API error:', err.response.status, err.response.data);
    } else {
      console.error('[Resend] Request error:', err.message);
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
  console.log(`[Resend] Fetching ${emailIds.length} emails by IDs with ${delayMs}ms delay`);
  
  const results = [];
  const errors = [];

  for (let i = 0; i < emailIds.length; i++) {
    const emailId = emailIds[i];
    try {
      const emailDetails = await fetchEmailById(emailId);
      results.push(emailDetails);
      console.log(`[Resend] ✅ Fetched email ${i + 1}/${emailIds.length}: ${emailId}`);
    } catch (err) {
      console.error(`[Resend] ❌ Failed to fetch email ${emailId}:`, err.message);
      errors.push({ emailId, error: err.message });
    }

    // Add delay between requests (except for the last one)
    if (i < emailIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { results, errors };
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use fetchEmailById or fetchEmailsByIds instead
 */
async function fetchResendEvents({ from, to, startDate, endDate }) {
  console.warn('[Resend] fetchResendEvents is deprecated. Use fetchEmailById or fetchEmailsByIds instead.');
  return [];
}

module.exports = { 
  fetchEmailById, 
  fetchEmailsByIds, 
  fetchResendEvents // Keep for backward compatibility
}; 