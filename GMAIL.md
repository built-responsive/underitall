# Gmail Integration & Email Template System

## Overview

This application integrates with Gmail through the Replit Gmail connector to send automated, templated emails for various business events including new wholesale applications, CRM customer creation, draft orders, and application errors.

## Architecture

### Components

1. **Gmail Service** (`server/gmail.ts`)
   - Handles Gmail API authentication via Replit connector
   - Provides send email functionality
   - Manages OAuth tokens automatically

2. **Email Service** (`server/services/emailService.ts`)
   - Template rendering engine with variable interpolation
   - Conditional logic support (`{{#if}}`, `{{#each}}`)
   - Database-backed template storage with file fallback
   - Email send logging

3. **Email Templates UI** (`/email-templates`)
   - Visual template management interface
   - Live preview with test data
   - Template editing and testing capabilities

4. **Database Schema** (`shared/schema.ts`)
   - `emailTemplates` table for storing templates
   - `emailSendLog` table for tracking sent emails

## Available Templates

### 1. New CRM Customer Welcome
**File:** `server/templates/new-crm-customer.html`  
**Trigger:** When a new wholesale account is created in the CRM  
**Recipients:** New wholesale customer

**Variables:**
```javascript
{
  firstName: string,
  lastName: string,
  firmName: string,
  email: string,
  phone?: string,
  businessType: string,
  clarityAccountId: string,
  businessAddress: string,
  businessAddress2?: string,
  city: string,
  state: string,
  zipCode: string,
  isTaxExempt?: boolean,
  taxId?: string
}
```

### 2. New Wholesale Application
**File:** `server/templates/new-wholesale-application.html`  
**Trigger:** When a wholesale application is submitted  
**Recipients:** Admin team for review

**Variables:**
```javascript
{
  firstName: string,
  lastName: string,
  firmName: string,
  email: string,
  phone: string,
  businessType: string,
  applicationDate: string,
  applicationNumber: string,
  pendingCount?: number,
  adminDashboardUrl: string,
  // ... address fields
}
```

### 3. New Draft Order
**File:** `server/templates/new-draft-order.html`  
**Trigger:** When a draft order is created in Shopify  
**Recipients:** Customer and/or admin team

**Variables:**
```javascript
{
  orderNumber: string,
  orderDate: string,
  customerName: string,
  customerEmail: string,
  accountType?: string,
  lineItems: Array<{
    name: string,
    variant?: string,
    quantity: number,
    sku?: string,
    price: string,
    unitPrice: string
  }>,
  subtotal: string,
  discount?: string,
  tax?: string,
  totalPrice: string,
  shopifyDraftOrderUrl: string,
  invoiceUrl?: string
}
```

### 4. Application Error Alert
**File:** `server/templates/app-error.html`  
**Trigger:** When a critical application error occurs  
**Recipients:** Development team

**Variables:**
```javascript
{
  timestamp: string,
  environment: string,
  errorType: string,
  errorMessage: string,
  service: string,
  critical?: boolean,
  high?: boolean,
  medium?: boolean,
  endpoint?: string,
  method?: string,
  userId?: string,
  stackTrace?: string,
  errorId: string,
  metrics?: {
    errorCount: number,
    affectedUsers: number,
    frequency: string
  }
}
```

## API Endpoints

### Get All Templates
```
GET /api/email-templates
```
Returns all email templates from the database.

### Get Specific Template
```
GET /api/email-templates/:id
```
Returns a specific template by ID.

### Update Template
```
PUT /api/email-templates/:id
```
Updates template content, subject, or settings.

**Request Body:**
```json
{
  "subject": "Updated Subject",
  "htmlContent": "<html>...</html>",
  "description": "Template description",
  "active": true
}
```

### Send Test Email
```
POST /api/email-templates/test
```
Sends a test email using a specific template.

**Request Body:**
```json
{
  "templateId": "template-id",
  "to": "test@example.com",
  "variables": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Get Email Send Log
```
GET /api/email-send-log
```
Returns the last 100 sent emails with status and metadata.

## Usage

### Sending Emails Programmatically

```javascript
import { 
  sendNewCRMCustomerEmail,
  sendNewWholesaleApplicationEmail,
  sendNewDraftOrderEmail,
  sendAppErrorEmail 
} from './server/services/emailService';

// Send welcome email to new CRM customer
await sendNewCRMCustomerEmail({
  to: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  firmName: 'Acme Design Studio',
  email: 'john@acmedesign.com',
  clarityAccountId: 'AC000123',
  businessType: 'interior_designer',
  // ... other required fields
});

// Send admin notification for new wholesale application
await sendNewWholesaleApplicationEmail({
  to: ['admin1@underitall.com', 'admin2@underitall.com'],
  firstName: 'Jane',
  lastName: 'Smith',
  applicationNumber: 'APP-2024-001',
  adminDashboardUrl: 'https://app.underitall.com/dashboard',
  // ... other required fields
});

// Send draft order notification
await sendNewDraftOrderEmail({
  to: 'customer@example.com',
  orderNumber: 'DO-2024-001',
  customerName: 'Acme Design',
  lineItems: [/* ... */],
  totalPrice: '$545.00',
  // ... other required fields
});

// Send error alert to dev team
await sendAppErrorEmail({
  to: 'dev-team@underitall.com',
  errorType: 'DatabaseConnectionError',
  errorMessage: 'Connection timeout',
  service: 'API',
  critical: true,
  // ... other required fields
});
```

### Using Generic Template Function

```javascript
import { sendTemplatedEmail } from './server/services/emailService';

// Send using any template by name
await sendTemplatedEmail(
  'recipient@example.com',
  'template-name',
  {
    variable1: 'value1',
    variable2: 'value2'
  }
);
```

## Template Syntax

### Basic Variables
```html
<p>Hello {{firstName}} {{lastName}}</p>
```

### Conditional Blocks
```html
{{#if isTaxExempt}}
  <p>Tax ID: {{taxId}}</p>
{{/if}}
```

### Loops
```html
{{#each lineItems}}
  <tr>
    <td>{{this.name}}</td>
    <td>{{this.quantity}}</td>
    <td>{{this.price}}</td>
  </tr>
{{/each}}
```

### Built-in Variables
- `{{currentYear}}` - Current year (e.g., 2024)
- `{{timestamp}}` - Formatted timestamp if provided in variables

## Configuration

### Gmail Integration Setup

The Gmail integration is configured through Replit's connector system. The following scopes are available:

- **gmail.send** - Send emails (currently active)
- **gmail.readonly** - Read inbox (requires additional setup)

### Environment Variables

The Gmail integration automatically manages the following:
- `GOOGLE_MAIL_REFRESH_TOKEN`
- `GOOGLE_MAIL_ACCESS_TOKEN` 
- `GOOGLE_MAIL_AUTHORIZED_USER`

These are handled by the Replit connector and refreshed automatically.

### Security Notes

1. **Access Token Management**: The system uses `getUncachableGmailClient()` to ensure fresh access tokens on every request
2. **Email Logging**: All sent emails are logged in the database with status and metadata
3. **Template Sanitization**: HTML content is stored as-is; ensure templates are from trusted sources
4. **Rate Limiting**: Gmail API has daily quotas; monitor send volumes

## Template Management UI

Access the template management interface at `/email-templates` to:

1. **View Templates**: See all available templates with categories
2. **Preview**: Live preview with rendered HTML
3. **Edit**: Modify subject lines and HTML content
4. **Test**: Send test emails with custom variables
5. **Monitor**: Check template activity status

## Database Schema

### emailTemplates Table
```sql
- id: UUID (primary key)
- name: string (unique)
- subject: string
- htmlContent: text
- textContent: text (optional)
- description: string (optional)
- variables: JSON (optional)
- category: string
- active: boolean
- createdAt: timestamp
- updatedAt: timestamp
```

### emailSendLog Table
```sql
- id: UUID (primary key)
- templateId: string
- recipient: string
- subject: string
- status: 'sent' | 'failed' | 'pending'
- errorMessage: string (optional)
- metadata: JSON (optional)
- sentAt: timestamp
- createdAt: timestamp
```

## Troubleshooting

### Common Issues

1. **Template Not Found**
   - Check if template exists in database
   - Verify template file exists in `server/templates/`
   - Run `initializeDefaultTemplates()` to reload

2. **Email Not Sending**
   - Verify Gmail integration is connected
   - Check access token validity
   - Review error logs in `emailSendLog` table

3. **Variable Not Replacing**
   - Ensure variable name matches exactly
   - Check for typos in template syntax
   - Verify variable is passed in data object

### Debug Mode

Enable detailed logging by checking the server console for:
- Template loading status
- Variable replacement details
- Gmail API responses
- Error messages

## Best Practices

1. **Template Design**
   - Keep templates responsive and mobile-friendly
   - Use inline CSS for better email client compatibility
   - Test across multiple email clients

2. **Variable Naming**
   - Use camelCase for consistency
   - Make variable names descriptive
   - Document required vs optional variables

3. **Error Handling**
   - Always provide fallback values for optional variables
   - Log failures for debugging
   - Implement retry logic for transient failures

4. **Performance**
   - Cache frequently used templates
   - Batch email sends when possible
   - Monitor API quotas and rate limits

## Future Enhancements

Potential improvements to consider:

1. **Email Scheduling**: Queue emails for optimal delivery times
2. **Analytics**: Track open rates and click-through rates
3. **A/B Testing**: Test different template versions
4. **Localization**: Multi-language template support
5. **Rich Text Editor**: Visual template editing
6. **Webhook Integration**: Trigger emails from external events
7. **Attachment Support**: Add files to emails
8. **Template Versioning**: Track template history