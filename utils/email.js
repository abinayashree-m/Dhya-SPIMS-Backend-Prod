const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY_SPIMS);

/**
 * 🔧 Replace template variables in email content
 */
function replaceTemplateVariables(content, variables = {}) {
  let processedContent = content;
  
  // Replace Resend-specific variables
  processedContent = processedContent.replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, '{{{RESEND_UNSUBSCRIBE_URL}}}');
  
  // Replace custom variables
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{\\{${key}\\}\\}\\}`, 'g');
    processedContent = processedContent.replace(regex, variables[key]);
  });
  
  return processedContent;
}

/**
 * 🔧 Fetch dynamic email signature block based on tenant ID
 */
async function getEmailSignature(tenant_id) {
  const settings = await prisma.settings.findUnique({
    where: { tenant_id },
    include: { tenant: true },
  });

  if (!settings || !settings.tenant) {
    return `<p>Regards,<br/>Team NSC Spinning Mills</p>`;
  }

  const name = settings.tenant.name || 'Team';
  const domain = settings.tenant.domain;
  const email = 'hosales@nscspgmills.com';
  const website = `https://nscspgmills.com`;
  const address = 'Avinashi, Tiruppur, Tamil Nadu, India';

  return `
    <p>Regards,<br/>
    <strong>${name}</strong><br/>
    ${address}<br/>
    <a href="mailto:${email}">${email}</a> | <a href="${website}" target="_blank">${website}</a></p>
  `;
}

/**
 * ✅ Send order confirmation email to buyer
 */
async function sendOrderConfirmationEmail({
  to,
  buyerName,
  orderNumber,
  count,
  quantity,
  tenant_id,
  shadeCode,
  orderDate,
  deliveryDate,
}) {
  const signature = await getEmailSignature(tenant_id);
  const formattedQuantity =
    quantity >= 0 ? `+/- ${Number(quantity).toFixed(2)}` : `${Number(quantity).toFixed(2)}`;

  const htmlContent = `
    <p>Hello ${buyerName},</p>

    <p>Your order <strong>${orderNumber}</strong> has been successfully created.</p>

    <p>
      <strong>Order Date:</strong> ${new Date(orderDate).toLocaleDateString('en-GB')}<br/>
      <strong>Expected Delivery Date:</strong> ${new Date(deliveryDate).toLocaleDateString('en-GB')}<br/>
      <strong>Shade Code:</strong> ${shadeCode}<br/>
      <strong>Quantity:</strong> ${formattedQuantity} kg<br/>
      <strong>Count:</strong> ${count || 'N/A'}
    </p>

    ${signature}
  `;

  const emailData = {
    from: 'NSC Spinning Mills <hosales@nscspgmills.com>',
    to,
    cc: ['dharsan@dhya.in', 'hosales@nscspgmills.com'],
    subject: `Order Confirmation – ${orderNumber}`,
    html: htmlContent,
    tags: [
      { name: 'email_type', value: 'order_confirmation' },
      { name: 'order_number', value: orderNumber },
      { name: 'tenant_id', value: tenant_id }
    ]
  };

  try {
    const result = await resend.emails.send(emailData);
    console.log(`✅ Order confirmation email sent: ${orderNumber} to ${to}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email: ${error.message}`);
    throw error;
  }
}

/**
 * ✅ Send bulk marketing email to buyer mailing lists (original function)
 */
async function sendBulkMarketingEmail({
  toEmails = [],
  subject,
  bodyHtml,
  campaignId = null,
  tenant_id = null,
}) {
  if (!toEmails.length || !subject || !bodyHtml) {
    throw new Error('Missing fields: toEmails, subject, or bodyHtml');
  }

  // Process template variables
  const processedBodyHtml = replaceTemplateVariables(bodyHtml);

  const fullHtml = `
    ${processedBodyHtml}
    <hr style="margin-top: 32px; opacity: 0.4;" />
  `;

  const results = [];
  const errors = [];

  for (const to of toEmails) {
    try {
      const emailData = {
        from: 'NSC Spinning Mills <hosales@nscspgmills.com>',
        to,
        subject,
        html: fullHtml,
        tags: [
          { name: 'email_type', value: 'marketing' },
          { name: 'campaign_id', value: campaignId || 'bulk' },
          { name: 'tenant_id', value: tenant_id || 'unknown' }
        ]
      };

      const result = await resend.emails.send(emailData);
      results.push({ to, success: true, emailId: result.id });
      console.log(`✅ Marketing email sent to: ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send marketing email to ${to}:`, error.message);
      errors.push({ to, success: false, error: error.message });
    }
  }

  // Log summary
  console.log(`📧 Bulk email summary: ${results.length} sent, ${errors.length} failed`);

  if (errors.length > 0) {
    console.warn('⚠️ Some emails failed to send:', errors);
  }

  return { results, errors };
}

/**
 * 🚀 Send bulk marketing email with batch processing for large campaigns
 */
async function sendBulkMarketingEmailBatched({
  toEmails = [],
  subject,
  bodyHtml,
  campaignId = null,
  tenant_id = null,
  batchSize = 100,
  delayBetweenBatches = 1000, // 1 second delay
}) {
  if (!toEmails.length || !subject || !bodyHtml) {
    throw new Error('Missing fields: toEmails, subject, or bodyHtml');
  }

  // Process template variables
  const processedBodyHtml = replaceTemplateVariables(bodyHtml);

  const fullHtml = `
    ${processedBodyHtml}
    <hr style="margin-top: 32px; opacity: 0.4;" />
  `;

  const results = [];
  const errors = [];
  const totalEmails = toEmails.length;
  const totalBatches = Math.ceil(totalEmails / batchSize);

  console.log(`📧 Starting batch email campaign: ${totalEmails} emails in ${totalBatches} batches`);

  for (let i = 0; i < totalEmails; i += batchSize) {
    const batch = toEmails.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`📧 Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);

    // Process batch in parallel
    const batchPromises = batch.map(async (to) => {
      try {
        const emailData = {
          from: 'NSC Spinning Mills <hosales@nscspgmills.com>',
          to,
          subject,
          html: fullHtml,
          tags: [
            { name: 'email_type', value: 'marketing' },
            { name: 'campaign_id', value: campaignId || 'bulk' },
            { name: 'tenant_id', value: tenant_id || 'unknown' },
            { name: 'batch_number', value: batchNumber.toString() }
          ]
        };

        const result = await resend.emails.send(emailData);
        return { to, success: true, emailId: result.id, batchNumber };
      } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return { to, success: false, error: error.message, batchNumber };
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process batch results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const emailResult = result.value;
        if (emailResult.success) {
          results.push(emailResult);
        } else {
          errors.push(emailResult);
        }
      } else {
        errors.push({ to: 'unknown', success: false, error: result.reason, batchNumber });
      }
    });

    console.log(`✅ Batch ${batchNumber} completed: ${results.length} sent, ${errors.length} failed`);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < totalEmails) {
      console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  // Log final summary
  console.log(`📧 Campaign completed: ${results.length} sent, ${errors.length} failed`);

  return { results, errors, summary: {
    totalEmails,
    totalBatches,
    batchSize,
    sent: results.length,
    failed: errors.length,
    successRate: ((results.length / totalEmails) * 100).toFixed(2) + '%'
  }};
}

/**
 * ✅ Send PO authorization and SO conversion email to buyer
 */
async function sendPOAuthorizationEmail({
  to,
  buyerName,
  poNumber,
  soNumber,
  tenant_id,
  items,
  poDate,
  deliveryDate,
}) {
  const signature = await getEmailSignature(tenant_id);

  // Format items into a table
  const itemsTable = items.map(item => `
    <tr>
      <td>${item.yarn_description}</td>
      <td>${item.color || 'N/A'}</td>
      <td>${item.count || 'N/A'}</td>
      <td>${item.quantity} ${item.uom}</td>
      <td>${item.shade_no || 'N/A'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <p>Hello ${buyerName},</p>

    <p>Your Purchase Order <strong>${poNumber}</strong> has been authorized and converted to Sales Order <strong>${soNumber}</strong>.</p>

    <p>
      <strong>PO Date:</strong> ${new Date(poDate).toLocaleDateString('en-GB')}<br/>
      <strong>Expected Delivery Date:</strong> ${new Date(deliveryDate).toLocaleDateString('en-GB')}
    </p>

    <h3>Order Details:</h3>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Color</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Count</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Quantity</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Shade No</th>
        </tr>
      </thead>
      <tbody>
        ${itemsTable}
      </tbody>
    </table>

    ${signature}
  `;

  const emailData = {
    from: 'NSC Spinning Mills <hosales@nscspgmills.com>',
    to,
    cc: ['dharsan@dhya.in', 'hosales@nscspgmills.com'],
    subject: `PO Authorization & SO Conversion – ${poNumber}`,
    html: htmlContent,
    tags: [
      { name: 'email_type', value: 'po_authorization' },
      { name: 'po_number', value: poNumber },
      { name: 'so_number', value: soNumber },
      { name: 'tenant_id', value: tenant_id }
    ]
  };

  try {
    const result = await resend.emails.send(emailData);
    console.log(`✅ PO authorization email sent: ${poNumber} to ${to}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send PO authorization email: ${error.message}`);
    throw error;
  }
}

/**
 * 🔍 Check if email is in bounce list
 */
async function isEmailBounced(email) {
  try {
    const bouncedEmail = await prisma.bouncedEmail.findUnique({
      where: { email: email.toLowerCase() }
    });
    return !!bouncedEmail;
  } catch (error) {
    console.error(`❌ Error checking bounce status for ${email}:`, error);
    return false;
  }
}

/**
 * 🚫 Filter out bounced emails from recipient list
 */
async function filterBouncedEmails(emails) {
  const validEmails = [];
  const bouncedEmails = [];

  for (const email of emails) {
    const isBounced = await isEmailBounced(email);
    if (isBounced) {
      bouncedEmails.push(email);
      console.log(`🚫 Skipping bounced email: ${email}`);
    } else {
      validEmails.push(email);
    }
  }

  if (bouncedEmails.length > 0) {
    console.log(`🚫 Filtered out ${bouncedEmails.length} bounced emails`);
  }

  return { validEmails, bouncedEmails };
}

/**
 * 🚀 Optimized bounce filtering for large email lists
 */
async function filterBouncedEmailsOptimized(emails, batchSize = 1000) {
  const validEmails = [];
  const bouncedEmails = [];
  const totalEmails = emails.length;
  const totalBatches = Math.ceil(totalEmails / batchSize);

  console.log(`🔍 Optimized bounce filtering: ${totalEmails} emails in ${totalBatches} batches`);

  for (let i = 0; i < totalEmails; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`🔍 Processing bounce filter batch ${batchNumber}/${totalBatches}`);

    try {
      // Batch query for bounced emails
      const bouncedInBatch = await prisma.bouncedEmail.findMany({
        where: {
          email: {
            in: batch.map(email => email.toLowerCase())
          }
        },
        select: { email: true }
      });

      const bouncedEmailsSet = new Set(bouncedInBatch.map(b => b.email));

      // Categorize emails in this batch
      batch.forEach(email => {
        if (bouncedEmailsSet.has(email.toLowerCase())) {
          bouncedEmails.push(email);
        } else {
          validEmails.push(email);
        }
      });

      console.log(`✅ Batch ${batchNumber} processed: ${batch.length - bouncedInBatch.length} valid, ${bouncedInBatch.length} bounced`);
    } catch (error) {
      console.error(`❌ Error processing bounce filter batch ${batchNumber}:`, error);
      // If batch fails, treat all emails as valid
      validEmails.push(...batch);
    }
  }

  console.log(`✅ Bounce filtering complete: ${validEmails.length} valid, ${bouncedEmails.length} bounced`);
  return { validEmails, bouncedEmails };
}

module.exports = {
  getEmailSignature,
  sendOrderConfirmationEmail,
  sendBulkMarketingEmail,
  sendBulkMarketingEmailBatched,
  sendPOAuthorizationEmail,
  isEmailBounced,
  filterBouncedEmails,
  filterBouncedEmailsOptimized,
};