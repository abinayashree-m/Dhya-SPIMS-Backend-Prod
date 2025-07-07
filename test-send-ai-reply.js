#!/usr/bin/env node

/**
 * Test Script: Send AI Reply
 * 
 * This script demonstrates the complete flow of sending an AI-generated reply:
 * 1. Generate an AI reply draft (async)
 * 2. Wait for the draft to be ready
 * 3. Send the approved reply through the existing EmailSender workflow
 * 
 * Usage: node test-send-ai-reply.js
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  TEST_TASK_ID: process.env.TEST_TASK_ID || '550e8400-e29b-41d4-a716-446655440001', // Replace with actual task ID
  JWT_TOKEN: process.env.JWT_TOKEN || 'your-jwt-token-here'
};

// Create axios instance with auth
const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  headers: {
    'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

/**
 * Sleep function for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if task has an AI draft ready
 */
async function checkTaskHasDraft(taskId) {
  try {
    console.log(`🔍 Checking if task ${taskId} has AI draft...`);
    
    const response = await api.get(`/api/growth/tasks/${taskId}`);
    const task = response.data;
    
    const hasDraft = task.description?.includes('AI REPLY DRAFT GENERATED') || false;
    const isGenerating = task.status === 'IN_PROGRESS' && task.taskType === 'REPLY_FOLLOWUP';
    
    console.log(`📋 Task status:`, {
      status: task.status,
      taskType: task.taskType,
      hasDraft: hasDraft,
      isGenerating: isGenerating,
      title: task.title
    });
    
    return { task, hasDraft, isGenerating };
  } catch (error) {
    console.error('❌ Error checking task:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate AI reply for a task
 */
async function generateAIReply(taskId) {
  try {
    console.log(`🤖 Generating AI reply for task: ${taskId}`);
    
    const response = await api.post(`/api/growth/tasks/${taskId}/generate-reply`);
    
    console.log('✅ AI reply generation started:', {
      status: response.data.status,
      estimatedTime: response.data.estimatedTime,
      context: response.data.context
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error generating AI reply:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get AI draft content
 */
async function getAIDraft(taskId) {
  try {
    console.log(`📄 Getting AI draft for task: ${taskId}`);
    
    const response = await api.get(`/api/growth/tasks/${taskId}/ai-draft`);
    
    console.log('✅ AI draft retrieved:', {
      draftId: response.data.draftId,
      subject: response.data.subject,
      bodyLength: response.data.body?.length || 0,
      contactName: response.data.contact?.name,
      createdAt: response.data.createdAt
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error getting AI draft:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send AI reply through EmailSender workflow
 */
async function sendAIReply(taskId) {
  try {
    console.log(`📤 Sending AI reply for task: ${taskId}`);
    
    const response = await api.post(`/api/growth/tasks/${taskId}/send-reply`);
    
    console.log('✅ AI reply sent successfully:', {
      status: response.data.status,
      emailId: response.data.emailId,
      subject: response.data.subject,
      recipient: response.data.recipient,
      contactName: response.data.contactName,
      taskId: response.data.taskId
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error sending AI reply:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Wait for AI draft to be ready (polling)
 */
async function waitForDraftReady(taskId, maxWaitTime = 300000) { // 5 minutes max
  console.log(`⏳ Waiting for AI draft to be ready (max ${maxWaitTime/1000}s)...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const { hasDraft, isGenerating } = await checkTaskHasDraft(taskId);
    
    if (hasDraft) {
      console.log('✅ AI draft is ready!');
      return true;
    }
    
    if (!isGenerating) {
      console.log('⚠️ Task is not generating, but no draft found. Something may have gone wrong.');
      return false;
    }
    
    console.log('⏳ Still generating... waiting 15 seconds');
    await sleep(15000); // Wait 15 seconds before checking again
  }
  
  console.log('❌ Timeout waiting for AI draft');
  return false;
}

/**
 * Main test function
 */
async function testSendAIReply() {
  console.log('🚀 Starting Send AI Reply Test');
  console.log('📋 Configuration:', {
    baseUrl: CONFIG.BASE_URL,
    taskId: CONFIG.TEST_TASK_ID,
    hasToken: !!CONFIG.JWT_TOKEN
  });
  
  try {
    // Step 1: Check initial task state
    console.log('\n=== STEP 1: Check Task State ===');
    const { task, hasDraft, isGenerating } = await checkTaskHasDraft(CONFIG.TEST_TASK_ID);
    
    // Step 2: Generate AI reply if needed
    if (!hasDraft && !isGenerating) {
      console.log('\n=== STEP 2: Generate AI Reply ===');
      await generateAIReply(CONFIG.TEST_TASK_ID);
      
      // Step 3: Wait for draft to be ready
      console.log('\n=== STEP 3: Wait for Draft Ready ===');
      const isDraftReady = await waitForDraftReady(CONFIG.TEST_TASK_ID);
      
      if (!isDraftReady) {
        console.log('❌ AI draft generation failed or timed out');
        process.exit(1);
      }
    } else if (isGenerating) {
      console.log('\n=== STEP 2-3: Wait for Current Generation ===');
      const isDraftReady = await waitForDraftReady(CONFIG.TEST_TASK_ID);
      
      if (!isDraftReady) {
        console.log('❌ AI draft generation failed or timed out');
        process.exit(1);
      }
    } else {
      console.log('✅ AI draft already exists, skipping generation');
    }
    
    // Step 4: Get and display the AI draft
    console.log('\n=== STEP 4: Review AI Draft ===');
    const draft = await getAIDraft(CONFIG.TEST_TASK_ID);
    
    console.log('\n📧 AI Draft Content:');
    console.log('Subject:', draft.subject);
    console.log('To:', `${draft.contact.name} <${draft.contact.email}>`);
    console.log('Company:', draft.contact.companyName);
    console.log('Body Preview:', draft.body.substring(0, 200) + '...');
    
    // Step 5: Confirm before sending
    console.log('\n=== STEP 5: Send Confirmation ===');
    console.log('⚠️  This will actually send the email to the customer!');
    console.log('📧 Recipient:', `${draft.contact.name} <${draft.contact.email}>`);
    console.log('📧 Subject:', draft.subject);
    
    // Auto-proceed in test mode (you can add manual confirmation here)
    const AUTO_SEND = process.env.AUTO_SEND === 'true';
    
    if (!AUTO_SEND) {
      console.log('\n❌ Auto-send disabled. Set AUTO_SEND=true to actually send the email.');
      console.log('✅ Test completed successfully (email not sent)');
      return;
    }
    
    // Step 6: Send the AI reply
    console.log('\n=== STEP 6: Send AI Reply ===');
    const sendResult = await sendAIReply(CONFIG.TEST_TASK_ID);
    
    console.log('\n🎉 SEND AI REPLY TEST COMPLETED SUCCESSFULLY!');
    console.log('📧 Email sent:', sendResult.emailId);
    console.log('📋 Task completed:', sendResult.taskId);
    console.log('📤 Status:', sendResult.status);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Help function
function showHelp() {
  console.log(`
🤖 Send AI Reply Test Script

Usage: node test-send-ai-reply.js

Environment Variables:
  BASE_URL        Backend URL (default: http://localhost:3000)
  TEST_TASK_ID    Task ID to test with (required)
  JWT_TOKEN       Authentication token (required)
  AUTO_SEND       Set to 'true' to actually send emails (default: false)

Example:
  BASE_URL=http://localhost:3000 \\
  TEST_TASK_ID=550e8400-e29b-41d4-a716-446655440001 \\
  JWT_TOKEN=your-jwt-token \\
  AUTO_SEND=true \\
  node test-send-ai-reply.js

This script tests the complete AI reply flow:
1. Check if task has existing AI draft
2. Generate AI reply if needed (async)
3. Wait for generation to complete
4. Display draft content for review
5. Send the approved reply via EmailSender workflow
6. Mark task as completed

⚠️  Warning: With AUTO_SEND=true, this WILL send actual emails!
`);
}

// Main execution
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  if (!CONFIG.TEST_TASK_ID || CONFIG.TEST_TASK_ID === 'your-task-id-here') {
    console.error('❌ Please set TEST_TASK_ID environment variable');
    process.exit(1);
  }
  
  if (!CONFIG.JWT_TOKEN || CONFIG.JWT_TOKEN === 'your-jwt-token-here') {
    console.error('❌ Please set JWT_TOKEN environment variable');
    process.exit(1);
  }
  
  testSendAIReply();
} 