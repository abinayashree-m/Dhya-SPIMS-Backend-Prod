const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY_SPIMS);

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

  await resend.emails.send({
    from: 'NSC Spinning Mills <hosales@nscspgmills.com>',
    to,
    cc: ['dharsan@dhya.in', 'hosales@nscspgmills.com'],
    subject: `Order Confirmation – ${orderNumber}`,
    html: htmlContent,
  });
}

/**
 * ✅ Send bulk marketing email to buyer mailing lists
 */
async function sendBulkMarketingEmail({
  toEmails = [],
  subject,
  bodyHtml,
}) {
  if (!toEmails.length || !subject || !bodyHtml) {
    throw new Error('Missing fields: toEmails, subject, or bodyHtml');
  }

  const fullHtml = `
    ${bodyHtml}
    <hr style="margin-top: 32px; opacity: 0.4;" />
  `;

  for (const to of toEmails) {
    await resend.emails.send({
      from: 'NSC Spinning Mills <hosales@nscspgmills.com>',
      to,
      subject,
      html: fullHtml,
    });
  }
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

  await resend.emails.send({
    from: 'NSC Spinning Mills <hosales@nscspgmills.com>',
    to,
    cc: ['dharsan@dhya.in', 'hosales@nscspgmills.com'],
    subject: `PO Authorization & SO Conversion – ${poNumber}`,
    html: htmlContent,
  });
}

module.exports = {
  getEmailSignature,
  sendOrderConfirmationEmail,
  sendBulkMarketingEmail,
  sendPOAuthorizationEmail,
};