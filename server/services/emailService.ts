
import { db } from '../db';
import { emailTemplates, emailSendLog } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';

// Load template HTML content from file
async function loadTemplateFile(templateName: string): Promise<string | null> {
  try {
    const templatePath = path.join(process.cwd(), 'server', 'templates', `${templateName}.html`);
    const content = await readFile(templatePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`❌ Failed to load template file: ${templateName}`, error);
    return null;
  }
}

// Simple variable replacement (supports {{variable}} syntax)
function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  // Add currentYear as a default variable
  variables.currentYear = new Date().getFullYear();
  
  // Replace simple variables
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  
  // Handle conditionals {{#if variable}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
    return variables[variable] ? content : '';
  });
  
  // Handle loops {{#each array}}...{{/each}}
  result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, variable, content) => {
    const array = variables[variable];
    if (!Array.isArray(array)) return '';
    
    return array.map(item => {
      let itemContent = content;
      Object.keys(item).forEach(key => {
        const regex = new RegExp(`{{this\\.${key}}}`, 'g');
        itemContent = itemContent.replace(regex, item[key] || '');
      });
      return itemContent;
    }).join('');
  });
  
  return result;
}

// Send email using Gmail API
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  try {
    const { google } = await import('googleapis');
    
    // Get fresh access token
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken) {
      throw new Error('Gmail connection not available');
    }

    const connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

    if (!accessToken) {
      throw new Error('Gmail access token not available');
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Convert HTML to plain text fallback
    const plainText = htmlContent
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Build MIME message with HTML + plain text
    const message = [
      `From: UnderItAll <noreply@itsunderitall.com>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="boundary123"`,
      '',
      '--boundary123',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      plainText,
      '--boundary123',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlContent,
      '--boundary123--',
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    console.log('✅ Email sent:', result.data.id);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
}

// Send templated email
export async function sendTemplatedEmail(
  to: string,
  templateName: string,
  variables: Record<string, any>
): Promise<boolean> {
  try {
    // Get template from database
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.name, templateName))
      .limit(1);
    
    if (!template) {
      console.error(`❌ Template not found: ${templateName}`);
      return false;
    }

    // Replace variables in subject and HTML
    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.htmlContent, variables);

    // Send email
    const success = await sendEmail(to, subject, htmlContent);

    // Log send attempt
    await db.insert(emailSendLog).values({
      templateId: template.id,
      recipient: to,
      subject,
      status: success ? 'sent' : 'failed',
      metadata: variables,
      sentAt: success ? new Date() : null,
    });

    return success;
  } catch (error) {
    console.error('❌ Templated email error:', error);
    return false;
  }
}

// Initialize default templates in database
export async function initializeDefaultTemplates() {
  const templates = [
    {
      name: 'new-crm-customer',
      subject: 'Welcome to UnderItAll Wholesale',
      description: 'Sent when a new CRM customer account is created',
      category: 'welcome',
      variables: ['firstName', 'lastName', 'firmName', 'email', 'clarityAccountId', 'businessType'],
      active: true,
    },
    {
      name: 'new-wholesale-application',
      subject: 'New Wholesale Application: {{firmName}}',
      description: 'Sent to admins when a new wholesale application is submitted',
      category: 'notification',
      variables: ['firstName', 'lastName', 'firmName', 'email', 'businessType', 'applicationNumber'],
      active: true,
    },
    {
      name: 'new-draft-order',
      subject: 'New Draft Order #{{orderNumber}}',
      description: 'Sent when a new draft order is created',
      category: 'order',
      variables: ['orderNumber', 'customerName', 'totalPrice', 'lineItems'],
      active: true,
    },
    {
      name: 'app-error',
      subject: '⚠️ Application Error: {{errorType}}',
      description: 'Sent when an application error occurs',
      category: 'error',
      variables: ['errorType', 'errorMessage', 'service', 'timestamp'],
      active: true,
    },
  ];
  
  for (const template of templates) {
    try {
      // Load the HTML content from file
      const htmlContent = await loadTemplateFile(template.name);
      if (!htmlContent) {
        console.error(`⚠️ Skipping template (file not found): ${template.name}`);
        continue;
      }

      // Check if template already exists
      const [existing] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.name, template.name))
        .limit(1);

      if (existing) {
        // Update existing template with fresh HTML from file
        await db
          .update(emailTemplates)
          .set({
            subject: template.subject,
            htmlContent,
            description: template.description,
            category: template.category,
            variables: template.variables,
            active: template.active,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.name, template.name));
        
        console.log(`✅ Updated template: ${template.name}`);
      } else {
        // Insert new template
        await db.insert(emailTemplates).values({
          name: template.name,
          subject: template.subject,
          htmlContent,
          description: template.description,
          category: template.category,
          variables: template.variables,
          active: template.active,
        });
        
        console.log(`✅ Created template: ${template.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to initialize template: ${template.name}`, error);
    }
  }
  
  console.log('✅ Email templates initialized');
}

// Convenience functions for specific email types
export async function sendNewCRMCustomerEmail(variables: {
  to: string;
  firstName: string;
  lastName: string;
  firmName: string;
  email: string;
  clarityAccountId: string;
  businessType: string;
  [key: string]: any;
}) {
  return sendTemplatedEmail(variables.to, 'new-crm-customer', variables);
}

export async function sendNewWholesaleApplicationEmail(variables: {
  to: string | string[];
  firstName: string;
  lastName: string;
  firmName: string;
  email: string;
  applicationNumber: string;
  [key: string]: any;
}) {
  const recipients = Array.isArray(variables.to) ? variables.to : [variables.to];
  const results = await Promise.all(
    recipients.map(recipient => 
      sendTemplatedEmail(recipient, 'new-wholesale-application', { ...variables, to: recipient })
    )
  );
  return results.every(r => r);
}

export async function sendNewDraftOrderEmail(variables: {
  to: string;
  orderNumber: string;
  customerName: string;
  totalPrice: string;
  lineItems: any[];
  [key: string]: any;
}) {
  return sendTemplatedEmail(variables.to, 'new-draft-order', variables);
}

export async function sendAppErrorEmail(variables: {
  to: string;
  errorType: string;
  errorMessage: string;
  service: string;
  timestamp: string;
  [key: string]: any;
}) {
  return sendTemplatedEmail(variables.to, 'app-error', variables);
}
