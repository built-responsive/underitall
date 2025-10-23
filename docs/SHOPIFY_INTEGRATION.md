
# UnderItAll Shopify Integration Guide

This guide explains how to integrate the UnderItAll Rug Pad Calculator and AI Chat Assistant into your Shopify theme.

## Overview

The UnderItAll application consists of three embeddable features:
1. **Rug Pad Calculator** - Custom sizing and pricing tool
2. **AI Chat Assistant** - Conversational shopping bot powered by OpenAI GPT-5
3. **Wholesale Registration** - Trade credential verification portal

## Prerequisites

Before integrating, you need:
- Shopify Admin API access token with draft order permissions
- Shopify Storefront API access token for product search
- Your Shopify shop domain (e.g., `your-store.myshopify.com`)

### Setting Up Shopify API Credentials

1. **Create a Custom App in Shopify Admin:**
   - Go to Settings → Apps and sales channels → Develop apps
   - Click "Create an app"
   - Name it "UnderItAll Integration"
   - Configure API scopes:
     - `write_draft_orders` (for creating draft orders)
     - `write_metaobjects` (for wholesale account management)
     - `write_customers` (for customer creation)
     - `read_products` (for product search in chat)
     - `read_inventory` (optional - for stock checking)

2. **Get Your API Credentials:**
   - **Admin Access Token** (`SHOPIFY_ADMIN_ACCESS_TOKEN`): From the app's API credentials page (starts with `shpat_`)
   - **Storefront Access Token** (`SHOPIFY_STOREFRONT_ACCESS_TOKEN`): From the Storefront API access section
   - **Shop Domain** (`SHOPIFY_SHOP_DOMAIN`): Your store's `.myshopify.com` domain

3. **Add Credentials to Replit:**
   Set these in your Replit Secrets (https://replit.com/secrets):
   ```bash
   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpss_xxxxxxxxxxxxx
   SHOPIFY_SHOP_DOMAIN=underitall-redeux.myshopify.com
   ```

## Integration Methods

### Method 1: Shopify Theme App Blocks (Recommended)

The most native integration using Shopify Theme App Extensions. This method provides drag-and-drop blocks in the Theme Customizer with no code required.

**Advantages:**
- Native Shopify integration
- No coding required - just drag and drop in Theme Customizer
- Automatic updates when you deploy new versions
- Full UnderItAll branding built-in
- Mobile responsive out of the box

**Setup:**
1. Deploy your Shopify app using Shopify CLI
2. Install the app on your store
3. In Theme Customizer, find "UnderItAll Calculator" and "UnderItAll Chat Assistant" under Apps
4. Add blocks to any page with drag-and-drop
5. Configure settings (API URL, position, etc.)

**See detailed instructions in:** `SHOPIFY_APP_BLOCKS.md`

### Method 2: Iframe Embed (Simple)

Embed the calculator or chat as an iframe in your Shopify theme:

#### Rug Pad Calculator

```html
<!-- Add this to your product page template -->
<div class="underitall-calculator-container">
  <h2>Custom Rug Pad Calculator</h2>
  <iframe 
    src="https://underitall-tools.replit.app/calculator" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border: none; border-radius: 8px;"
  ></iframe>
</div>
```

#### AI Chat Assistant (Standalone Page)

Create a new page template in Shopify with the chat interface:

```html
<!-- Add this to a custom page template -->
<div class="underitall-chat-container">
  <iframe 
    src="https://your-replit-app.replit.app/" 
    width="100%" 
    height="600px" 
    frameborder="0"
    style="border: none; border-radius: 8px;"
  ></iframe>
</div>
```

### Method 3: JavaScript Widget (Advanced)

For a more integrated experience, use the JavaScript embed approach:

#### Chat Bubble Widget

Add this script to your theme's `theme.liquid` file, just before `</body>`:

```html
<!-- UnderItAll Chat Widget -->
<script>
  (function() {
    // Create container for React app
    const chatContainer = document.createElement('div');
    chatContainer.id = 'underitall-chat-root';
    document.body.appendChild(chatContainer);
    
    // Load React and dependencies
    const reactScript = document.createElement('script');
    reactScript.src = 'https://your-replit-app.replit.app/assets/index.js';
    reactScript.type = 'module';
    document.body.appendChild(reactScript);
    
    // Load styles
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://your-replit-app.replit.app/assets/index.css';
    document.head.appendChild(cssLink);
  })();
</script>
```

## Customer Account Extension Integration

### Overview

The Wholesale Account Profile Extension allows customers to manage their wholesale account information directly from their Shopify customer account profile page. This provides a seamless self-service experience without requiring admin intervention for basic updates.

### Installation (Shopify App)

**Automatic Installation via Shopify CLI:**
1. Extension is included in `extensions/wholesale-account-profile/`
2. Deploy app: `npm run shopify app deploy`
3. Extension automatically appears in customer account profiles
4. No theme customization required

**Manual Configuration:**
- Extension target: `customer-account.profile.block.render`
- Appears under "Account Information" section
- Visible only to customers with linked `wholesale_account` metaobject

### Customer Experience

**When Customer Has Wholesale Account:**
1. Navigate to customer account profile
2. See "Wholesale Account Information" card
3. Edit fields directly in form
4. Click "Update Account" button
5. See success message confirming update
6. Changes immediately reflected in Shopify Admin

**When Customer Lacks Wholesale Account:**
- Shows informational banner: "No wholesale account found"
- Prompts to contact support for wholesale access
- Prevents unauthorized wholesale account creation

### API Configuration

**Required Environment Variables:**
```bash
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx  # Must have write_metaobjects scope
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
```

**Backend Endpoint:**
- Path: `PATCH /api/wholesale-account/:metaobjectId`
- Authentication: Uses Shopify Admin API token
- Rate Limiting: Respects Shopify API limits (2 req/sec)

### Customization Options

**Editable Fields (Default):**
- Company Name
- Email
- Phone
- Website
- Instagram
- Street Address
- Suite/Unit
- City, State, ZIP
- VAT/Tax ID
- Tax Exempt Status
- Source
- Additional Message

**Add New Field:**
1. Update Shopify metaobject definition in Admin
2. Edit `ProfileBlock.jsx` to add TextField/Checkbox
3. Update `PATCH /api/wholesale-account/:metaobjectId` handler
4. Test update flow

**Remove Field:**
1. Remove from `ProfileBlock.jsx` form
2. Keep backend handler support (for backward compatibility)

### Troubleshooting

**Extension Not Appearing:**
- Verify app installed on store
- Check customer has `custom.wholesale_account` metafield
- Redeploy extension: `npm run shopify app deploy`

**Update Fails:**
- Check `SHOPIFY_ADMIN_ACCESS_TOKEN` has `write_metaobjects` scope
- Verify metaobject ID is valid GID format
- Check Shopify Admin API logs for errors

**Data Not Syncing:**
- Verify `metaobjects/update` webhook is configured
- Check `webhook_logs` table for webhook delivery
- Ensure CRM API credentials are valid

## Feature Integration Details

### Rug Pad Calculator

**What it does:**
- Calculates custom rug pad pricing based on dimensions
- Supports 4 shapes: Rectangle, Round, Square, Free Form
- Two thickness options: Luxe Lite (⅛") and Luxe (¼")
- Creates Shopify draft orders directly (when credentials configured)

**Integration endpoints:**
- Calculator page: `/calculator`
- API endpoint: `POST /api/calculator/calculate`
- Draft order creation: `POST /api/calculator/draft-order`

**Example API usage:**
```javascript
// Calculate pricing
const response = await fetch('https://your-app.replit.app/api/calculator/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    width: 8,
    length: 10,
    thickness: '1/8',
    shape: 'Rectangle',
    quantity: 1
  })
});
const quote = await response.json();
```

### AI Chat Assistant

**What it does:**
- Answers customer questions about rug pads
- Provides sizing and product recommendations
- Guides customers through the ordering process
- Maintains conversation history

**Integration:**
- Floating chat bubble appears on all pages
- Powered by OpenAI GPT-5
- Can be customized with your brand colors

**API endpoints:**
- Send message: `POST /api/chat/message`
- Get conversations: `GET /api/chat/conversations`

### Wholesale Registration

**What it does:**
- Collects business credentials from trade professionals
- Verifies trade licenses and certifications
- Admin approval workflow
- Creates Shopify customer accounts with wholesale tags
- Syncs to Clarity CRM (Account + Contact + Attachments)

**Integration:**
- Registration form: `/wholesale-registration`
- Admin dashboard: `/admin`
- API endpoint: `POST /api/wholesale-registration`

**CRM Sync (when approved):**
1. Creates Account in Clarity CRM
2. Creates Contact linked to Account
3. Uploads certification files as Attachments
4. Creates Shopify Customer with metaobject reference

**Required Environment Variables:**
```bash
CRM_BASE_URL=https://claritymobileapi.claritycrm.com
CRM_API_KEY=underitall-key-xxxxxxxxxxxxxxxx
```

## Customization

### Brand Colors

Update the application to match your Shopify theme by modifying `client/src/index.css`:

```css
:root {
  --primary: 14 100% 60%; /* Rorange #F2633A */
  --foreground: 0 0% 20%;
  --background: 0 0% 100%;
  /* ... other color variables */
}
```

### Typography

The application uses:
- **Archivo** - Headlines and UI elements
- **Lora** - Body text and descriptions
- **Vazirmatn** - Numbers and data

These can be customized in `client/index.html` and `client/src/index.css`.

## Testing the Integration

1. **Test Calculator Functionality:**
   - Enter different dimensions and verify pricing calculations
   - Test all 4 shape options
   - Verify draft order creation (requires Shopify credentials)

2. **Test Chat Assistant:**
   - Ask questions about rug pads
   - Verify responses are accurate and helpful
   - Check conversation history persistence

3. **Test Wholesale Registration:**
   - Submit a test registration
   - Verify admin notifications
   - Test approval/rejection workflow

## Deployment

### Publishing Your Replit App

1. Click the "Publish" button in Replit
2. Your app will be available at: `https://your-replit-app.replit.app`
3. Update all iframe and script URLs to use your published URL

### Custom Domain (Optional)

To use your own domain:
1. Go to Replit deployment settings
2. Add your custom domain (e.g., `calculator.underitall.com`)
3. Update DNS records as instructed
4. Update all embed codes with your custom domain

## Troubleshooting

### Calculator Not Loading Prices

**Issue:** Calculator shows "Calculating..." but never updates
**Solution:** Check that:
- Price matrix files (`priceBreakMap_Thin.json`, `priceBreakMap_Thick.json`) are present
- Backend API is responding at `/api/calculator/calculate`
- Browser console shows no CORS errors

### Draft Orders Not Creating

**Issue:** "Create Draft Order" button fails
**Solution:** Verify:
- Shopify credentials are set correctly in environment variables
- Admin API token has `write_draft_orders` scope
- Shop domain is correct format (e.g., `store.myshopify.com`)

### Chat Assistant Not Responding

**Issue:** Chat sends messages but doesn't get AI responses
**Solution:** Check:
- OpenAI integration is configured (should be automatic via Replit)
- Backend logs for any API errors
- Message is being sent to `/api/chat/message` endpoint

### CORS Issues

**Issue:** Browser console shows CORS errors when embedding
**Solution:** The application is configured to allow all origins. If issues persist:
- Verify the iframe `src` URL is correct
- Check that your Shopify theme isn't blocking iframes
- Try Method 2 (JavaScript Widget) instead

## Support and Maintenance

### Updating Price Matrices

To update rug pad pricing:
1. Update CSV files in Google Sheets
2. Export as JSON
3. Replace `server/data/priceBreakMap_Thin.json` and `priceBreakMap_Thick.json`
4. Redeploy the application

### Adding New Features

The application is built with a modular architecture:
- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Express.js + PostgreSQL
- **Styling:** Follows UnderItAll brand guidelines

To add features:
1. Update database schema in `shared/schema.ts`
2. Add API routes in `server/routes.ts`
3. Create frontend components in `client/src/components/`
4. Test and deploy

## Security Considerations

- All Shopify API credentials are stored as environment variables
- Database uses PostgreSQL with proper indexing and relationships
- API endpoints validate all input using Zod schemas
- Chat conversations are session-based and encrypted
- Admin dashboard requires authentication (configure as needed)

## Performance Optimization

- Calculator uses in-memory caching for price lookups
- Chat messages are batched to reduce API calls
- Static assets are served with caching headers
- Database queries are optimized with proper indexes

## Next Steps

1. Configure Shopify API credentials
2. Choose your integration method (iframe, widget, or app)
3. Customize colors and branding
4. Test all features thoroughly
5. Deploy and embed in your Shopify theme
6. Monitor performance and user feedback

For additional help, refer to the main application documentation in `replit.md`.
