import { sendEmail } from '../gmail';
import { db } from '../db';
import { emailTemplates, emailSendLog } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface TemplateVariables {
  [key: string]: any;
}

// Replace template variables with actual values
function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  let result = template;
  
  // Replace simple variables {{variableName}}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  
  // Handle conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
    return variables[variable] ? content : '';
  });
  
  // Handle each loops {{#each items}}...{{/each}}
  result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, variable, content) => {
    const items = variables[variable];
    if (!Array.isArray(items)) return '';
    
    return items.map(item => {
      let itemContent = content;
      // Replace {{this.property}} with item properties
      Object.keys(item).forEach(key => {
        const regex = new RegExp(`{{this\\.${key}}}`, 'g');
        itemContent = itemContent.replace(regex, item[key] || '');
      });
      return itemContent;
    }).join('');
  });
  
  // Add current year
  result = result.replace(/{{currentYear}}/g, new Date().getFullYear().toString());
  
  // Add formatted dates
  if (variables.timestamp) {
    result = result.replace(/{{timestamp}}/g, new Date(variables.timestamp).toLocaleString());
  }
  
  return result;
}

// Load template from file
async function loadTemplateFile(templateName: string): Promise<string | null> {
  try {
    const templatePath = path.join(process.cwd(), 'server/templates', `${templateName}.html`);
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load template file ${templateName}:`, error);
    return null;
  }
}

// Get template from database or file
async function getTemplate(templateName: string): Promise<{ subject: string; htmlContent: string } | null> {
  try {
    // First try to get from database
    const [dbTemplate] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.name, templateName))
      .limit(1);
    
    if (dbTemplate && dbTemplate.active) {
      return {
        subject: dbTemplate.subject,
        htmlContent: dbTemplate.htmlContent
      };
    }
    
    // Fallback to file templates
    const fileContent = await loadTemplateFile(templateName);
    if (fileContent) {
      // Extract subject from template if possible
      const subjectMatch = fileContent.match(/<title>(.*?)<\/title>/);
      const subject = subjectMatch ? subjectMatch[1] : 'Notification from Under It All';
      
      return {
        subject,
        htmlContent: fileContent
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get template ${templateName}:`, error);
    return null;
  }
}

// Send templated email
export async function sendTemplatedEmail(
  to: string | string[],
  templateName: string,
  variables: TemplateVariables
): Promise<boolean> {
  try {
    const template = await getTemplate(templateName);
    if (!template) {
      console.error(`Template ${templateName} not found`);
      return false;
    }
    
    // Replace variables in template
    const subject = replaceTemplateVariables(template.subject, variables);
    const htmlContent = replaceTemplateVariables(template.htmlContent, variables);
    
    // Convert HTML to plain text for Gmail API (basic conversion)
    const plainText = htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    // Send to multiple recipients if array
    const recipients = Array.isArray(to) ? to : [to];
    
    for (const recipient of recipients) {
      try {
        // Send the email
        await sendEmail(recipient, subject, plainText);
        
        // Log the send
        await db.insert(emailSendLog).values({
          templateId: templateName, // Using template name as ID for file-based templates
          recipient,
          subject,
          status: 'sent',
          metadata: { variables, templateName },
          sentAt: new Date(),
        });
        
        console.log(`✅ Email sent successfully to ${recipient} using template ${templateName}`);
      } catch (error) {
        // Log the failure
        await db.insert(emailSendLog).values({
          templateId: templateName,
          recipient,
          subject,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: { variables, templateName },
        });
        
        console.error(`Failed to send email to ${recipient}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send templated email:', error);
    return false;
  }
}

// Specific email functions for different notifications

export async function sendNewCRMCustomerEmail(data: {
  to: string | string[];
  firstName: string;
  lastName: string;
  firmName: string;
  email: string;
  phone?: string;
  businessType: string;
  clarityAccountId: string;
  businessAddress: string;
  businessAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
  isTaxExempt?: boolean;
  taxId?: string;
}) {
  return sendTemplatedEmail(data.to, 'new-crm-customer', data);
}

export async function sendNewWholesaleApplicationEmail(data: {
  to: string | string[];
  firstName: string;
  lastName: string;
  firmName: string;
  email: string;
  phone: string;
  businessType: string;
  businessAddress: string;
  businessAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
  applicationDate: string;
  applicationNumber: string;
  pendingCount?: number;
  taxExempt?: boolean;
  taxId?: string;
  website?: string;
  instagramHandle?: string;
  yearsInBusiness?: number;
  howDidYouHear?: string;
  adminDashboardUrl: string;
}) {
  return sendTemplatedEmail(data.to, 'new-wholesale-application', data);
}

export async function sendNewDraftOrderEmail(data: {
  to: string | string[];
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  accountType?: string;
  lineItems: Array<{
    name: string;
    variant?: string;
    quantity: number;
    sku?: string;
    price: string;
    unitPrice: string;
  }>;
  subtotal: string;
  discount?: string;
  tax?: string;
  totalPrice: string;
  customerNotes?: string;
  shopifyDraftOrderUrl: string;
  invoiceUrl?: string;
}) {
  return sendTemplatedEmail(data.to, 'new-draft-order', data);
}

export async function sendAppErrorEmail(data: {
  to: string | string[];
  timestamp: string;
  environment: string;
  errorType: string;
  errorMessage: string;
  service: string;
  critical?: boolean;
  high?: boolean;
  medium?: boolean;
  endpoint?: string;
  method?: string;
  userId?: string;
  stackTrace?: string;
  requestData?: string;
  errorId: string;
  logsUrl?: string;
  dashboardUrl?: string;
  suggestedActions?: string[];
  metrics?: {
    errorCount: number;
    affectedUsers: number;
    frequency: string;
  };
}) {
  return sendTemplatedEmail(data.to, 'app-error', data);
}

// Initialize default templates in database
export async function initializeDefaultTemplates() {
  const templates = [
    {
      name: 'new-crm-customer',
      subject: 'Welcome to Under It All Wholesale - Account Created',
      description: 'Sent when a new CRM customer account is created',
      category: 'welcome',
      variables: ['firstName', 'lastName', 'firmName', 'email', 'clarityAccountId', 'businessType']
    },
    {
      name: 'new-wholesale-application',
      subject: 'New Wholesale Application Received - Review Required',
      description: 'Sent to admins when a new wholesale application is submitted',
      category: 'notification',
      variables: ['firstName', 'lastName', 'firmName', 'email', 'businessType', 'applicationNumber']
    },
    {
      name: 'new-draft-order',
      subject: 'New Draft Order #{{orderNumber}} Created',
      description: 'Sent when a new draft order is created',
      category: 'order',
      variables: ['orderNumber', 'customerName', 'totalPrice', 'lineItems']
    },
    {
      name: 'app-error',
      subject: '⚠️ Application Error: {{errorType}}',
      description: 'Sent when an application error occurs',
      category: 'error',
      variables: ['errorType', 'errorMessage', 'service', 'timestamp']
    }
  ];
  
  for (const template of templates) {
    try {
      // Load the HTML content from file
      const htmlContent = await loadTemplateFile(template.name);
      if (!htmlContent) continue;
      
      // Check if template already exists
      const [existing] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.name, template.name))
        .limit(1);
      
      if (!existing) {
        await db.insert(emailTemplates).values({
          name: template.name,
          subject: template.subject,
          htmlContent,
          description: template.description,
          category: template.category,
          variables: template.variables,
          active: true
        });
        console.log(`✅ Initialized template: ${template.name}`);
      }
    } catch (error) {
      console.error(`Failed to initialize template ${template.name}:`, error);
    }
  }
}