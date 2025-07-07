# AI Reply Drafter n8n Workflow Setup

## 📋 Overview

The AI Reply Drafter is an n8n workflow that generates intelligent reply drafts when triggered by the Texintelli application. This workflow receives customer reply context and uses Google Gemini AI to generate professional, contextual responses.

## 🔧 Workflow Setup

### Workflow Name: `[Texintelli] ReplyDrafter`

### Node Configuration

#### 1. Webhook Trigger Node
**Triggers the workflow when a reply draft is requested**

- **Type:** Webhook
- **HTTP Method:** POST
- **Authentication:** None (relies on environment isolation)
- **Path:** `/reply-drafter` (or your preferred path)

**Expected Request Body:**
```json
{
  "taskId": "uuid-of-the-task",
  "contactName": "John Smith",
  "contactEmail": "john@company.com",
  "companyName": "ABC Corp",
  "campaignName": "Q4 Outreach Campaign",
  "originalEmail": {
    "id": "email-uuid",
    "subject": "Partnership Opportunity",
    "body": "Hi John,\n\nI hope this email finds you well..."
  },
  "replyText": "Thank you for reaching out. We're definitely interested in exploring this partnership...",
  "companyPersona": {
    "id": "persona-uuid",
    "summary": "Texintelli is a leading textile manufacturing company specializing in high-quality cotton and synthetic blends..."
  }
}
```

#### 2. Google Gemini Node
**Generates the AI-powered reply draft**

- **Type:** Google Gemini
- **Model:** `gemini-1.5-pro` (recommended for best results)
- **Authentication:** Google Service Account with Gemini API access

**Prompt Configuration:**
```text
You are an expert B2B sales assistant for a textile manufacturing company. Your task is to draft a helpful and professional response to a customer's email.

**CONTEXT:**
- Customer: {{ $json.contactName }} from {{ $json.companyName }}
- Our Original Email Subject: "{{ $json.originalEmail.subject }}"
- Our Original Email Body: "{{ $json.originalEmail.body }}"
- Customer's Reply: "{{ $json.replyText }}"
- About Our Company: "{{ $json.companyPersona.summary }}"

**YOUR TASK:**
Based on the customer's reply above, draft a concise, helpful, and professional response. Follow these guidelines:

1. **Acknowledge their response** - Show that you've read and understood their message
2. **Answer any questions** they asked directly and clearly
3. **Provide value** - Offer relevant information, resources, or next steps
4. **Maintain professional tone** - Friendly but business-appropriate
5. **Include a clear call-to-action** - Suggest a specific next step if appropriate
6. **Keep it concise** - Aim for 2-3 paragraphs maximum

**IMPORTANT GUIDELINES:**
- Do NOT include email headers, signatures, or subject lines
- Do NOT use placeholder text like [Company Name] - use actual information provided
- Do respond directly to their specific concerns or interests
- Do suggest concrete next steps when appropriate (catalog, sample, call, meeting)
- Use a warm but professional tone that builds relationship

Generate only the email body text, ready to copy and paste into an email client.
```

**Response Processing:**
- **Variable:** `generatedReply`
- **Format:** Plain text (the AI-generated email body)

#### 3. Code Node (Optional - Reply Formatting)
**Cleans and formats the AI response**

- **Name:** Format Reply
- **JavaScript Code:**

```javascript
// Get the AI-generated response
let reply = $json.generatedReply || $json.reply || $json.text || '';

// Basic cleanup: remove any email headers/signatures that might have been generated
reply = reply
  .replace(/^(From:|To:|Subject:|Date:).*$/gm, '') // Remove email headers
  .replace(/^Best regards,?\s*$/gm, '') // Remove standalone signatures
  .replace(/^Sincerely,?\s*$/gm, '') // Remove standalone signatures
  .replace(/^\s*[\r\n]+/gm, '\n') // Remove excessive line breaks
  .trim(); // Remove leading/trailing whitespace

// Add a professional closing if none exists
if (!reply.match(/(Best regards|Sincerely|Best|Thanks|Thank you|Looking forward)/i)) {
  reply += '\n\nBest regards';
}

// Return the formatted reply
return [{
  json: {
    reply: reply,
    taskId: $input.item.json.taskId,
    contactName: $input.item.json.contactName,
    companyName: $input.item.json.companyName
  }
}];
```

#### 4. Respond to Webhook Node
**Returns the generated reply to the frontend**

- **Type:** Respond to Webhook
- **Response Body:** 
```json
{
  "reply": "{{ $json.reply }}",
  "taskId": "{{ $json.taskId }}",
  "contactName": "{{ $json.contactName }}",
  "companyName": "{{ $json.companyName }}",
  "status": "success"
}
```

### Complete Workflow Flow
```
Webhook Trigger → Google Gemini → Format Reply → Respond to Webhook
```

## 🔐 Environment Configuration

### Backend Environment Variables

Add to your backend `.env` file:

```bash
# n8n ReplyDrafter Webhook URL
N8N_REPLY_DRAFTER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/reply-drafter
```

### Google Gemini API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable Gemini API**
   - Navigate to APIs & Services
   - Enable "Generative AI API" 
   - Enable "AI Platform API"

3. **Create Service Account**
   - Go to IAM & Admin → Service Accounts
   - Create new service account
   - Assign "AI Platform User" role
   - Download JSON key file

4. **Configure n8n Credentials**
   - In n8n, create new "Google" credential
   - Upload the service account JSON
   - Test connection

## 🧪 Testing the Workflow

### Test Request Example

```bash
curl -X POST "https://your-n8n-instance.com/webhook/reply-drafter" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test-task-123",
    "contactName": "John Smith",
    "contactEmail": "john@example.com", 
    "companyName": "Test Company Inc",
    "campaignName": "Q4 Outreach",
    "originalEmail": {
      "id": "email-123",
      "subject": "Partnership Opportunity",
      "body": "Hi John,\n\nI hope this email finds you well. We are a textile manufacturing company specializing in premium cotton blends and would love to explore potential partnership opportunities with Test Company Inc.\n\nWould you be interested in learning more about our capabilities?"
    },
    "replyText": "Thank you for reaching out! We are definitely interested in learning more about your textile capabilities. Could you send us some information about your product catalog and pricing?",
    "companyPersona": {
      "id": "persona-123",
      "summary": "Texintelli is a leading textile manufacturing company with over 20 years of experience in producing high-quality cotton and synthetic fiber blends. We specialize in sustainable manufacturing processes and serve clients across the fashion and home textiles industries."
    }
  }'
```

### Expected Response

```json
{
  "reply": "Thank you for your interest, John! I'm delighted to hear that Test Company Inc. is interested in learning more about our textile capabilities.\n\nI'd be happy to provide you with our comprehensive product catalog and pricing information. Our portfolio includes premium cotton blends, sustainable synthetic fibers, and custom textile solutions that might be perfect for your needs. Given our 20+ years of experience in the industry, we've developed some innovative approaches to quality and sustainability that many of our partners find valuable.\n\nI'll prepare a tailored information package for Test Company Inc. and send it over within the next 24 hours. Would you also be open to a brief call next week to discuss your specific requirements in more detail?\n\nBest regards",
  "taskId": "test-task-123",
  "contactName": "John Smith",
  "companyName": "Test Company Inc",
  "status": "success"
}
```

## 🎯 Quality Guidelines for AI Responses

### Good Response Characteristics:
- ✅ Directly addresses the customer's questions/concerns
- ✅ Maintains professional but warm tone
- ✅ Includes specific next steps
- ✅ References company expertise naturally
- ✅ Shows genuine interest in their business
- ✅ Appropriate length (not too long or short)

### Response Quality Examples:

**Customer Reply:** *"We're looking for organic cotton suppliers for our new sustainable clothing line."*

**Good AI Response:**
```
Thank you for reaching out about organic cotton supplies for your sustainable clothing line - this aligns perfectly with our commitment to eco-friendly manufacturing!

We specialize in certified organic cotton production and have been supplying sustainable textile solutions for over 20 years. Our organic cotton meets GOTS (Global Organic Textile Standard) certification and we can provide full traceability documentation for your supply chain transparency.

I'd love to learn more about your specific requirements and volume needs. Could we schedule a brief call this week to discuss how we can support your sustainable clothing line? I can also send you our organic cotton catalog and sustainability certifications.

Best regards
```

**Poor Response (too generic):**
```
Thank you for your email. We have organic cotton available. Please let me know if you're interested.
```

## 🔧 Troubleshooting

### Common Issues:

1. **Webhook Timeout (408 Error)**
   - **Problem:** Gemini API is taking too long
   - **Solution:** Increase timeout in backend to 45 seconds
   - **Prevention:** Use streaming responses if available

2. **Empty/Invalid Responses**
   - **Problem:** Gemini prompt is too vague or context is missing
   - **Solution:** Check all required fields are present in request
   - **Fix:** Improve prompt specificity

3. **Response Too Generic**
   - **Problem:** AI not using provided context effectively
   - **Solution:** Enhance prompt to emphasize context usage
   - **Fix:** Add examples of good vs. bad responses

4. **Authentication Failures**
   - **Problem:** Google credentials expired or invalid
   - **Solution:** Regenerate service account key
   - **Fix:** Verify API permissions and quotas

### Debug Steps:

1. **Check n8n Execution Log**
   - Go to n8n workflow executions
   - Review each node's input/output
   - Look for error messages

2. **Test Each Node Individually**
   - Use n8n's manual execution
   - Verify data flow between nodes
   - Check variable substitutions

3. **Validate Request Format**
   - Ensure all required fields present
   - Check JSON syntax validity
   - Verify data types match expected

## 📊 Performance Optimization

### Response Time Optimization:
- Use `gemini-1.5-flash` for faster responses (slightly lower quality)
- Implement response caching for similar requests
- Use shorter, more focused prompts
- Optimize prompt for single-shot responses

### Cost Optimization:
- Monitor Gemini API usage and costs
- Implement request validation to avoid unnecessary calls
- Use prompt engineering to reduce token usage
- Consider response caching for common scenarios

## 🔄 Integration with Backend

The backend endpoint `/api/growth/tasks/:taskId/generate-reply` automatically:

1. **Gathers Context** - Fetches task, contact, email, and persona data
2. **Validates Task Type** - Ensures it's a reply follow-up task
3. **Extracts Reply Text** - Parses customer's reply from task notes
4. **Triggers n8n** - Sends complete context bundle to this workflow
5. **Returns Response** - Delivers AI-generated draft to frontend

### Integration Flow:
```
Frontend → Backend API → n8n Workflow → Gemini AI → Response → Frontend
```

## 🚀 Deployment Checklist

- [ ] n8n workflow created and tested
- [ ] Google Gemini API credentials configured
- [ ] Environment variable `N8N_REPLY_DRAFTER_WEBHOOK_URL` set
- [ ] Webhook URL accessible from backend
- [ ] Test request/response cycle working
- [ ] Error handling implemented
- [ ] Response quality validated
- [ ] Performance tested with realistic load

---

**Status:** 🔧 Ready for Implementation | Requires n8n Setup and Google Gemini API Access 