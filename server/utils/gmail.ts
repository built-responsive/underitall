
import { google } from 'googleapis';

// Initialize Gmail API client using Replit OAuth token
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: process.env.GMAIL_OAUTH_TOKEN,
  });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Send wholesale account notification email
export async function sendWholesaleAccountEmail(options: {
  to: string[];
  subject: string;
  company: string;
  contact: { firstName: string; lastName: string; email: string; phone?: string };
  address: { address1: string; city: string; state: string; zip: string };
  clarityAccountId: string;
  shopifyCustomerId?: string;
}) {
  try {
    const gmail = getGmailClient();

    // Build HTML email body (inline styles for Gmail compatibility)
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F3F1E9; color: #212227; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { padding: 40px; text-align: center; background: #FFFFFF; }
    .header h1 { font-family: 'Archivo', sans-serif; color: #F2633A; margin: 0 0 12px; font-size: 32px; }
    .badge { display: inline-block; background: #F2633A; color: #FFFFFF; padding: 12px 24px; border-radius: 11px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .section { padding: 20px 40px; border-bottom: 1px solid #E1E0DA; }
    .section:last-child { border-bottom: none; }
    .label { color: #696A6D; font-weight: 600; font-size: 14px; }
    .value { color: #212227; font-size: 14px; margin-bottom: 12px; }
    .footer { padding: 30px 40px; background: #F3F1E9; text-align: center; font-size: 12px; color: #696A6D; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://join.itsunderitall.com/brand/logo-main.png" alt="UnderItAll Logo" style="height: 64px; margin-bottom: 24px;">
      <h1>New Wholesale Account</h1>
      <p style="color: #7e8d76; font-style: italic; font-size: 16px;">${new Date().toLocaleDateString()}</p>
    </div>
    
    <div style="padding: 30px 40px; text-align: center;">
      <div class="badge">${options.company}</div>
    </div>

    <div class="section">
      <div class="value"><span class="label">Company:</span> ${options.company}</div>
      <div class="value"><span class="label">Contact:</span> ${options.contact.firstName} ${options.contact.lastName}</div>
      <div class="value"><span class="label">Email:</span> <a href="mailto:${options.contact.email}" style="color: #F2633A; text-decoration: none;">${options.contact.email}</a></div>
      ${options.contact.phone ? `<div class="value"><span class="label">Phone:</span> ${options.contact.phone}</div>` : ''}
    </div>

    <div class="section">
      <div class="value"><span class="label">Address:</span> ${options.address.address1}</div>
      <div class="value"><span class="label">City, State ZIP:</span> ${options.address.city}, ${options.address.state} ${options.address.zip}</div>
    </div>

    <div class="section">
      <div class="value"><span class="label">Clarity Account ID:</span> <code style="background: #1a1a1a; padding: 4px 8px; border-radius: 4px; color: #10b981; font-size: 12px;">${options.clarityAccountId}</code></div>
      ${options.shopifyCustomerId ? `<div class="value"><span class="label">Shopify Customer ID:</span> <code style="background: #1a1a1a; padding: 4px 8px; border-radius: 4px; color: #96bf48; font-size: 12px;">${options.shopifyCustomerId}</code></div>` : ''}
    </div>

    <div class="footer">
      <p style="margin: 0 0 8px;">Wholesale account notification · UnderItAll</p>
      <p style="margin: 0;">© 2025 UnderItAll Holdings LLC</p>
    </div>
  </div>
</body>
</html>
    `;

    // Build plain text fallback
    const textBody = `
New Wholesale Account: ${options.company}

Contact: ${options.contact.firstName} ${options.contact.lastName}
Email: ${options.contact.email}
${options.contact.phone ? `Phone: ${options.contact.phone}` : ''}

Address: ${options.address.address1}
City, State ZIP: ${options.address.city}, ${options.address.state} ${options.address.zip}

Clarity Account ID: ${options.clarityAccountId}
${options.shopifyCustomerId ? `Shopify Customer ID: ${options.shopifyCustomerId}` : ''}

---
Wholesale account notification · UnderItAll
© 2025 UnderItAll Holdings LLC
    `.trim();

    // Build MIME message (multipart/alternative for HTML + plain text)
    const message = [
      `From: UnderItAll Wholesale <noreply@itsunderitall.com>`,
      `To: ${options.to.join(', ')}`,
      `Subject: ${options.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="boundary123"`,
      '',
      '--boundary123',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      textBody,
      '--boundary123',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '--boundary123--',
    ].join('\n');

    // Base64 encode the message (Gmail API requirement)
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('✅ Gmail notification sent:', result.data.id);
    return result.data;
  } catch (error) {
    console.error('❌ Gmail send error:', error);
    throw error;
  }
}
