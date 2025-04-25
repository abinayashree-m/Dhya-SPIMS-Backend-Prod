const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY); // ⬅️ Set in .env file

/**
 * 🔧 Fetch dynamic email signature block based on tenant ID
 */
async function getEmailSignature(tenant_id) {
  const settings = await prisma.settings.findUnique({
    where: { tenant_id },
    include: { tenant: true },
  });

  if (!settings || !settings.tenant) {
    return `<p>Regards,<br/>Team Dhya</p>`;
  }

  const name = settings.tenant.name || 'Team';
  const domain = settings.tenant.domain;
  const email = domain ? `info@${domain}` : 'support@example.com';
  const website = domain ? `https://${domain}` : '#';
  const address = 'Avinashi, Tiruppur , Tamil Nadu, India'; // Optional: dynamic later

  return `
    <p>Regards,<br/>
    <strong>${name}</strong><br/>
    ${address}<br/>
    <a href="mailto:${email}">${email}</a> | <a href="${website}" target="_blank">${website}</a></p>
  `;
}

/**
 * Send order confirmation email
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
  
    const htmlContent = `
      <p>Hello ${buyerName},</p>
  
      <p>Your order <strong>${orderNumber}</strong> has been successfully created.</p>
  
      <p>
        <strong>Order Date:</strong> ${new Date(orderDate).toLocaleDateString('en-GB')}<br/>
        <strong>Delivery Date:</strong> ${new Date(deliveryDate).toLocaleDateString('en-GB')}<br/>
        <strong>Shade Code:</strong> ${shadeCode}<br/>
        <strong>Quantity:</strong> ${quantity} kg<br/>
        <strong>Count:</strong> ${count || 'N/A'}
      </p>
  
      ${signature}
    `;
  
    await resend.emails.send({
      from: 'Dhya <info@dhya.in>',
      to,
      cc: ['dharsan@dhya.in'],
      subject: `Order Confirmation – ${orderNumber}`,
      html: htmlContent,
    });
  }
  

module.exports = {
  getEmailSignature,
  sendOrderConfirmationEmail,
};