# Environment Variables for Growth Engine Module 4

## New Required Environment Variable

Add this to your `.env` file:

```bash
# n8n DraftGenerator Webhook URL for AI-powered outreach email generation
N8N_DRAFTGENERATOR_WEBHOOK_URL=https://your-n8n-instance.com/webhook/draft-generator

# Existing variables (for reference)
N8N_PERSONAGENERATOR_WEBHOOK_URL=https://your-n8n-instance.com/webhook/persona-generator
N8N_BRANDSCOUT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/brand-scout
N8N_SUPPLIERFINDER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/supplier-finder
N8N_API_KEY=your-n8n-api-key-here
```

## Usage

The `N8N_DRAFTGENERATOR_WEBHOOK_URL` will be used by the `/api/growth/contacts/:contactId/generate-draft` endpoint to trigger the AI-powered email draft generation workflow in n8n.

## Next Steps

1. Set up the DraftGenerator workflow in n8n
2. Configure the webhook URL in your environment
3. Test the draft generation functionality 