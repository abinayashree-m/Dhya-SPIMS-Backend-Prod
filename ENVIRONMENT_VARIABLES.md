# Environment Variables for Growth Engine Module 4

## New Required Environment Variable

Add this to your `.env` file:

```bash
# n8n DraftGenerator Webhook URL for AI-powered outreach email generation
N8N_DRAFTGENERATOR_WEBHOOK_URL=https://your-n8n-instance.com/webhook/draft-generator

# n8n EmailSender Webhook URL for sending approved emails (both outreach and replies)
N8N_EMAIL_SENDER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/email-sender

# Existing variables (for reference)
N8N_PERSONAGENERATOR_WEBHOOK_URL=https://your-n8n-instance.com/webhook/persona-generator
N8N_BRANDSCOUT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/brand-scout
N8N_SUPPLIERFINDER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/supplier-finder
N8N_API_KEY=your-n8n-api-key-here
```

## Usage

- The `N8N_DRAFTGENERATOR_WEBHOOK_URL` will be used by the `/api/growth/contacts/:contactId/generate-draft` endpoint to trigger the AI-powered email draft generation workflow in n8n.

- The `N8N_EMAIL_SENDER_WEBHOOK_URL` will be used by both:
  - `/api/growth/outreach-emails/:emailId/send` endpoint to send initial outreach emails
  - `/api/growth/tasks/:taskId/send-reply` endpoint to send AI-generated reply drafts

This reuses the existing modular EmailSender workflow for all email sending operations.

## Next Steps

1. Set up the DraftGenerator workflow in n8n
2. Set up the EmailSender workflow in n8n (if not already done)
3. Configure both webhook URLs in your environment
4. Test the draft generation and email sending functionality 