# Email Webhook Setup Guide

## Overview
Real-time email tracking and analytics for SPIMS using Resend webhooks.

## Setup Steps

### 1. Environment Variables
```env
RESEND_API_KEY_SPIMS=your_api_key
RESEND_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Database Migration
```bash
npx prisma migrate dev --name add_email_webhooks
```

### 3. Install Dependencies
```bash
npm install svix
```

### 4. Configure Resend Webhook
- URL: `https://your-domain.com/api/webhooks/resend`
- Events: All email events (sent, delivered, opened, clicked, bounced, complained)
- Copy signing secret to environment variables

## Features
- Real-time email tracking
- Automatic bounce filtering
- Campaign analytics
- Webhook signature verification
- Multi-tenant support

## API Endpoints
- `POST /api/webhooks/resend` - Webhook receiver
- `GET /api/webhooks/analytics` - Email analytics
- `GET /api/webhooks/events` - Email events
- `GET /api/webhooks/bounces` - Bounced emails

## Testing
1. Send test email campaign
2. Check webhook events in logs
3. Verify analytics data
4. Test bounce filtering

## Security
- HTTPS required for webhooks
- Svix signature verification
- Rate limiting recommended
- Error isolation from email sending

## Frontend Integration

### New Components
- `EmailAnalyticsPanel`: Displays email analytics and webhook events
- Enhanced `BulkEmailPanel`: Shows campaign performance metrics

### New API Functions
- `getEmailAnalytics()`: Fetch email analytics
- `getEmailEvents()`: Fetch email events
- `getBouncedEmails()`: Fetch bounced emails
- `removeBouncedEmail()`: Remove email from bounce list

### New Types
- `EmailEvent`: Email event data structure
- `BouncedEmail`: Bounced email data structure
- `EmailAnalytics`: Analytics data structure

## Monitoring

### Logs to Monitor
- Webhook signature verification failures
- Email event processing errors
- Bounce handling errors
- Campaign analytics generation

### Key Metrics
- Email delivery rates
- Open and click rates
- Bounce rates by type
- Campaign performance over time

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL is accessible
   - Verify HTTPS is enabled
   - Check webhook configuration in Resend dashboard

2. **Signature Verification Fails**
   - Verify `RESEND_WEBHOOK_SECRET` is correct
   - Check webhook secret in Resend dashboard
   - Ensure raw request body is used for verification

3. **Events Not Being Recorded**
   - Check database connection
   - Verify Prisma schema is up to date
   - Check application logs for errors

4. **Bounce Filtering Not Working**
   - Verify bounce events are being received
   - Check `BouncedEmail` table for records
   - Ensure email addresses are being normalized

### Debug Commands

```bash
# Check webhook endpoint
curl -X GET https://your-domain.com/api/webhooks/analytics

# Check database tables
npx prisma studio

# View application logs
tail -f logs/app.log
```

## Support

For issues with the webhook implementation:
1. Check the application logs
2. Verify webhook configuration in Resend
3. Test webhook endpoint accessibility
4. Review database schema and migrations 