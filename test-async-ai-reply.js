const axios = require('axios');
require('dotenv').config();

/**
 * 🧪 TEST ASYNC AI REPLY GENERATION
 * This script tests the new asynchronous AI reply generation flow
 */

const BASE_URL = process.env.BACKEND_BASE_URL || 'https://dhya-spims-backend-prod.onrender.com';
const API_TOKEN = process.env.TEST_API_TOKEN || process.env.JWT_TOKEN;

console.log('🧪 [TEST] === ASYNC AI REPLY GENERATION TEST ===');
console.log('🔗 [TEST] Base URL:', BASE_URL);
console.log('🔐 [TEST] Using API token:', API_TOKEN ? 'YES' : 'NO');

if (!API_TOKEN) {
  console.error('❌ [TEST] No API token found. Set TEST_API_TOKEN or JWT_TOKEN in .env');
  process.exit(1);
}

// Test the async flow
async function testAsyncAIReply() {
  console.log('');
  console.log('🚀 [TEST] === TESTING ASYNC AI REPLY GENERATION ===');

  try {
    // First, get available tasks
    console.log('📋 [TEST] Getting available tasks...');
    const tasksResponse = await axios.get(`${BASE_URL}/api/growth/tasks`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ [TEST] Tasks retrieved:', {
      count: tasksResponse.data?.tasks?.length || 0,
      status: tasksResponse.status
    });

    if (!tasksResponse.data?.tasks?.length) {
      console.log('ℹ️ [TEST] No tasks available for testing');
      return;
    }

    // Find a reply follow-up task
    const replyTask = tasksResponse.data.tasks.find(task => 
      task.relatedEmailId !== null
    );

    if (!replyTask) {
      console.log('ℹ️ [TEST] No reply follow-up tasks available for testing');
      return;
    }

    console.log('🎯 [TEST] Using task for test:', {
      taskId: replyTask.id,
      title: replyTask.title,
      hasRelatedEmail: !!replyTask.relatedEmailId,
      status: replyTask.status
    });

    // Test the async AI reply generation
    console.log('🚀 [TEST] Triggering async AI reply generation...');
    const startTime = Date.now();

    const aiReplyResponse = await axios.post(
      `${BASE_URL}/api/growth/tasks/${replyTask.id}/generate-reply`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // Should respond quickly now
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ [TEST] === ASYNC TRIGGER SUCCESS ===');
    console.log('⏱️ [TEST] Response time:', duration + 'ms (should be < 5 seconds)');
    console.log('📊 [TEST] Status code:', aiReplyResponse.status, '(should be 202)');
    console.log('📝 [TEST] Response data:', aiReplyResponse.data);

    if (aiReplyResponse.status === 202) {
      console.log('🎉 [TEST] Perfect! Async flow working correctly');
      console.log('💡 [TEST] The AI reply will be generated in background');
      console.log('💡 [TEST] n8n will call back when ready with the draft');
      
      // Monitor task status changes
      console.log('');
      console.log('👀 [TEST] Monitoring task status for changes...');
      await monitorTaskStatus(replyTask.id, 120); // Monitor for 2 minutes
      
    } else {
      console.log('⚠️ [TEST] Unexpected status code. Expected 202, got:', aiReplyResponse.status);
    }

  } catch (error) {
    console.error('❌ [TEST] === ASYNC AI REPLY TEST FAILED ===');
    
    if (error.response) {
      console.error('📊 [TEST] HTTP Error:', error.response.status);
      console.error('📝 [TEST] Error response:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ [TEST] Timeout - but this should NOT happen with async flow');
    } else {
      console.error('❓ [TEST] Unknown error:', error.message);
    }
    
    console.error('🔧 [TEST] Full error:', error);
  }
}

// Monitor task status changes
async function monitorTaskStatus(taskId, maxSeconds = 120) {
  const startTime = Date.now();
  const maxTime = maxSeconds * 1000;
  let lastStatus = null;
  let checkCount = 0;

  console.log(`👀 [TEST] Monitoring task ${taskId} for ${maxSeconds} seconds...`);

  while (Date.now() - startTime < maxTime) {
    try {
      checkCount++;
      
      const taskResponse = await axios.get(`${BASE_URL}/api/growth/tasks`, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const task = taskResponse.data?.tasks?.find(t => t.id === taskId);
      
      if (task && task.status !== lastStatus) {
        console.log(`📋 [TEST] Task status update (check #${checkCount}):`, {
          status: task.status,
          previousStatus: lastStatus,
          title: task.title,
          updatedAt: task.updatedAt
        });
        
        lastStatus = task.status;
        
        // Check if AI draft was generated (look for draft info in notes)
        if (task.notes?.includes('AI REPLY DRAFT GENERATED')) {
          console.log('🎉 [TEST] === AI DRAFT GENERATED ===');
          console.log('✅ [TEST] Found AI draft information in task notes');
          
          // Extract draft ID from notes
          const draftIdMatch = task.notes.match(/Draft ID: ([a-f0-9-]+)/);
          if (draftIdMatch) {
            const draftId = draftIdMatch[1];
            console.log('📧 [TEST] Draft ID:', draftId);
            
            // Try to fetch the draft email
            await checkDraftEmail(draftId);
          }
          
          console.log('✅ [TEST] Async AI reply generation SUCCESSFUL!');
          return;
        }
        
        if (task.status === 'TODO' && lastStatus === 'IN_PROGRESS') {
          console.log('✅ [TEST] Task returned to TODO status - draft should be ready');
        }
      }
      
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error('❌ [TEST] Error checking task status:', error.message);
    }
  }
  
  console.log('⏰ [TEST] Monitoring timeout after', maxSeconds, 'seconds');
  console.log('💡 [TEST] Check your n8n workflow logs if draft was not generated');
}

// Check if draft email was created
async function checkDraftEmail(draftId) {
  try {
    console.log('📧 [TEST] Checking draft email:', draftId);
    
    // Note: You'd need to implement a GET endpoint for outreach emails if you want to fetch it
    // For now, just log that we found the ID
    console.log('✅ [TEST] Draft email ID extracted successfully');
    
  } catch (error) {
    console.error('❌ [TEST] Error checking draft email:', error.message);
  }
}

// Run the test
testAsyncAIReply(); 