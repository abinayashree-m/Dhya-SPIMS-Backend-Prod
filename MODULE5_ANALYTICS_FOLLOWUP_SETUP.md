# Module 5: Analytics & Follow-Up Flow Implementation

## 📋 Overview

Module 5 implements an automated reply detection and follow-up task creation system. When prospects reply to your outreach emails, the system automatically:

1. **Detects replies** in your inbox using n8n workflow
2. **Identifies the sender** as a tracked contact in your database
3. **Creates high-priority follow-up tasks** for immediate attention
4. **Updates email status** to "REPLIED" for accurate tracking

## 🔧 Backend Implementation

### New API Endpoints

#### 1. Find Contact by Email (Smart Contact & Tenant Lookup)
**Endpoint:** `GET /api/growth/contacts/find-by-email?email={email}`

**Purpose:** Find a contact by email address and automatically determine tenant context

**Authentication:** API Key (for n8n automation)

**Request:**
```bash
GET /api/growth/contacts/find-by-email?email=prospect@company.com
Headers: x-api-key: your-api-key
```

**Response (200):**
```json
{
  "message": "Contact found successfully",
  "tenantId": "3bf9bed5-d468-47c5-9c19-61a7e37faedc",
  "contact": {
    "id": "contact-uuid",
    "name": "John Smith",
    "email": "prospect@company.com",
    "title": "Procurement Manager",
    "supplier": {
      "id": "supplier-uuid",
      "companyName": "ABC Corp",
      "country": "USA"
    },
    "campaign": {
      "id": "campaign-uuid",
      "name": "Q4 Outreach Campaign",
      "tenantId": "3bf9bed5-d468-47c5-9c19-61a7e37faedc"
    }
  }
}
```

**Response (404):**
```json
{
  "message": "Contact not found",
  "email": "unknown@example.com",
  "searchedWithTenantId": "none (searched all tenants)"
}
```

#### 2. Create Task from Reply (Main Endpoint)
**Endpoint:** `POST /api/growth/tasks/create-from-reply`

**Purpose:** Creates a follow-up task when a reply is detected by n8n

**Authentication:** API Key (for n8n automation)

**Request Body:**
```json
{
  "senderEmail": "prospect@company.com",
  "subject": "Re: Partnership Opportunity",
  "tenantId": "3bf9bed5-d468-47c5-9c19-61a7e37faedc"
}
```

**Success Response (201):**
```json
{
  "message": "Follow-up task created successfully.",
  "task": {
    "id": "task-uuid",
    "title": "Reply received from: John Smith",
    "priority": "HIGH",
    "contactName": "John Smith",
    "companyName": "ABC Corp"
  },
  "emailUpdated": true,
  "originalEmailId": "email-uuid"
}
```

**Ignored Response (200):**
```json
{
  "message": "Sender is not a tracked contact, task not created.",
  "senderEmail": "unknown@example.com",
  "action": "ignored"
}
```

### Implementation Details

1. **Dynamic Tenant Resolution**: Automatically determines tenant context from inbox email
2. **Email Address Cleaning**: Extracts clean email addresses from formatted sender fields
3. **Contact Verification**: Verifies sender exists in your tracked contacts database
4. **Email Linking**: Links the task to the original outreach email
5. **Status Updates**: Updates the original email status to "REPLIED"
6. **Rich Task Information**: Includes contact details, company info, and campaign context
7. **Smart Filtering**: Only creates tasks for tracked contacts to avoid spam
8. **Error Resilience**: Graceful handling of unknown contacts and malformed data

### Database Changes

The system uses existing database tables:
- `targetContact` - For contact lookup
- `outreachEmail` - For email status updates
- `followUpTask` - For task creation

## 🤖 n8n Workflow Setup

### Workflow Name: `[Texintelli] ReplyProcessor`

### Node Configuration

#### 1. Gmail Trigger Node
- **Type:** Gmail Trigger
- **Event:** Message Added
- **Credentials:** Your sales inbox (e.g., dharsan@dhya.com)
- **Optional:** Set specific folder/label to monitor

#### 2. Code Node (Clean Sender Email)
*Extracts clean email address from formatted sender field*

- **Name:** Clean Sender Email
- **JavaScript Code:**
```javascript
const fromString = $input.item.json.from[0].address;
let cleanedEmail = fromString;

// Regex to find an email address inside angle brackets
const emailInBrackets = fromString.match(/<(.*?)>/);

if (emailInBrackets && emailInBrackets[1]) {
  cleanedEmail = emailInBrackets[1];
}

// Add the cleaned email back to the data
$input.item.json.cleanedSenderEmail = cleanedEmail;

return $input.item;
```

#### 3. HTTP Request Node (Smart Contact & Tenant Lookup)
*Finds the contact and automatically determines tenant context*

- **Name:** Find Contact & Tenant
- **Method:** GET
- **URL Expression:** `https://dhya-spims-backend-prod.onrender.com/api/growth/contacts/find-by-email?email={{ $nodes["Clean Sender Email"].json.cleanedSenderEmail }}`
- **Authentication:** Header Auth
- **Header Name:** `x-api-key`
- **Header Value:** `{{ $vars.API_KEY }}`

#### 4. HTTP Request Node (Create Follow-Up Task)
*Creates the high-priority follow-up task*

- **Name:** Create Follow-Up Task
- **Method:** POST
- **URL:** `https://dhya-spims-backend-prod.onrender.com/api/growth/tasks/create-from-reply`
- **Authentication:** Header Auth
- **Header Name:** `x-api-key`
- **Header Value:** `{{ $vars.API_KEY }}`
- **Body Type:** JSON (Raw)
- **Body Expression:**
```javascript
{
  "senderEmail": "{{ $nodes["Clean Sender Email"].json.cleanedSenderEmail }}",
  "subject": "{{ $json.subject }}",
  "tenantId": "{{ $nodes["Find Contact & Tenant"].json.tenantId }}"
}
```

### Workflow Flow
```
Gmail Trigger → Clean Sender Email → Find Contact & Tenant → Create Follow-Up Task
```

### Key Improvements
- ✅ **Simplified Architecture:** Only 4 nodes instead of 5
- ✅ **Smart Tenant Detection:** Automatic tenant lookup from contact relationships
- ✅ **Robust Email Cleaning:** Handles formatted email addresses reliably
- ✅ **Contact Verification:** Ensures sender is a tracked prospect
- ✅ **Error Handling:** Graceful handling of unknown contacts

## 🧪 Testing

### Manual Testing
Run the test file to verify the endpoint:

```bash
cd Dhya-SPIMS-Backend-Prod
node test-reply-processing.js
```

### Test Scenarios
1. **Valid Reply:** From tracked contact → Task created
2. **Unknown Sender:** From non-tracked contact → Ignored
3. **Invalid Request:** Missing fields → Error response

### Expected Behavior
- ✅ Creates HIGH priority tasks for tracked contacts
- ✅ Links tasks to original emails
- ✅ Updates email status to "REPLIED"
- ✅ Ignores non-tracked contacts
- ✅ Provides detailed task information

## 📊 Analytics Integration

### Task Analytics
The follow-up tasks integrate with the existing analytics system:

- **Reply Rate Tracking:** Emails marked as "REPLIED" are tracked in campaign analytics
- **Response Time:** Task creation timestamps help measure response times
- **Follow-up Success:** Task completion rates indicate follow-up effectiveness

### Key Metrics
- **Reply Rate:** Percentage of emails that receive replies
- **Response Time:** Average time between email sent and reply received
- **Follow-up Completion:** Percentage of reply tasks completed

## 🔄 Workflow Benefits

### Automation Benefits
1. **Zero Manual Monitoring:** No need to constantly check inbox
2. **Immediate Notification:** High-priority tasks ensure quick response
3. **Context Preservation:** Links tasks to original campaigns and emails
4. **Accurate Tracking:** Automatic status updates maintain data integrity

### Business Benefits
1. **Faster Response Times:** Automated task creation ensures prompt follow-up
2. **Better Conversion:** Quick responses to interested prospects
3. **Improved Organization:** Centralized task management
4. **Data-Driven Insights:** Reply tracking enables campaign optimization

## 🛠️ Troubleshooting

### Common Issues

1. **❌ 401 Unauthorized Error**
   - **Problem:** `Authorization header missing` or `JWT token verification failed`
   - **Cause:** n8n endpoint using JWT auth instead of API key auth
   - **Solution:** Ensure endpoint uses `n8nAuthMiddleware` not `verifyToken`
   - **Fix:** Add `x-api-key` header to n8n HTTP requests

2. **❌ 404 Endpoint Not Found**
   - **Problem:** `Cannot GET /api/growth/contacts/find-by-email`
   - **Cause:** Missing endpoint implementation
   - **Solution:** Restart backend server to load new routes
   - **Fix:** Ensure all n8n endpoints are properly defined

3. **❌ Tasks Not Created**
   - Check n8n workflow is active
   - Verify API key authentication
   - Confirm contact exists in database
   - Check tenantId is correct

4. **❌ Duplicate Tasks**
   - Add filters to n8n workflow
   - Check email processing rules
   - Implement task deduplication

5. **❌ Wrong Contact Matching**
   - Verify email addresses in database
   - Check tenant ID configuration
   - Validate contact lookup logic

### Debug Steps

1. **Check Backend Logs:**
   ```bash
   # View recent logs
   tail -f logs/growth.log
   ```

2. **Test API Endpoint:**
   ```bash
   # Run test script
   node test-reply-processing.js
   ```

3. **Verify n8n Workflow:**
   - Check workflow execution history
   - Verify node configurations
   - Test with sample data

## 📈 Performance Considerations

### Optimization Features
- **Parallel Processing:** Multiple replies processed simultaneously
- **Efficient Queries:** Optimized database lookups
- **Smart Filtering:** Only processes tracked contacts
- **Error Handling:** Graceful handling of invalid requests

### Scalability
- **High Throughput:** Handles multiple concurrent requests
- **Database Optimization:** Indexed queries for fast lookups
- **Resource Efficient:** Minimal server resources required

## 🔒 Security & Authentication

### Authentication Strategy

**🤖 n8n Automation Endpoints (API Key Auth):**
- `POST /api/growth/tasks/create-from-reply` - Reply processing
- `GET /api/growth/contacts/find-by-email` - Contact lookup
- `POST /api/growth/campaigns/{id}/brands` - Save discovered brands
- `