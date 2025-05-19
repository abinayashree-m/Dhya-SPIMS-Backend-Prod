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

    console.log(`📧 Sent to: ${to}`);
  }
}

module.exports = {
  getEmailSignature,
  sendOrderConfirmationEmail,
  sendBulkMarketingEmail,
};