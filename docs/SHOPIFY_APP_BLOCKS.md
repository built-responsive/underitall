# Shopify Theme App Blocks Integration Guide

This guide explains how to deploy and use the UnderItAll Shopify theme app blocks for seamless integration into your Shopify theme.

## Overview

The UnderItAll application provides two Shopify Theme App Blocks:

1. **Calculator Block** - Custom rug pad sizing and pricing calculator
2. **Chat Assistant Block** - AI-powered shopping assistant with GPT-5

These blocks allow you to embed UnderItAll functionality directly into your Shopify theme using the Theme Customizer - no coding required!

## Prerequisites

Before you begin, you need:

- A Shopify Partner account
- Shopify CLI installed (`npm install -g @shopify/cli @shopify/app`)
- Your Replit app deployed and running
- Basic familiarity with Shopify app development

## Project Structure

```
extensions/
└── underitall-blocks/
    ├── blocks/
    │   ├── calculator.liquid          # Calculator block template
    │   └── chat-assistant.liquid      # Chat bubble template
    ├── assets/
    │   ├── calculator-block.js        # Calculator React bundle
    │   ├── calculator-block.css       # Calculator styles
    │   ├── chat-block.js              # Chat React bundle
    │   └── chat-block.css             # Chat styles
    ├── locales/
    │   └── en.default.json           # Translations (shared)
    └── shopify.extension.toml        # Extension config (unified)
```

## Step 1: Configure Shopify App

### Update shopify.app.toml

The `shopify.app.toml` file is already configured, but you need to update the URLs with your deployed Replit app URL:

```toml
# shopify.app.toml
client_id = "5582dab174be026e3f6fb451ba89839e"
name = "UNDERITALL TOOLS"
application_url = "https://underitall-tools.replit.app"
embedded = true

[auth]
redirect_urls = [
  "https://your-app.replit.app",
  "https://your-app.replit.app/auth/callback"
]

[app_proxy]
url = "https://underitall-tools.replit.app"
subpath = "uia"
prefix = "apps"

[app_preferences]
url = "https://underitall-tools.replit.app/admin"
```

**What this means:**
- App Proxy: Shopify routes `yourstore.com/apps/uia/*` → `https://underitall-tools.replit.app/*`
- App Preferences: Admin settings link → `/admin` page

### Get Your Shopify App Client ID

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click "Apps" → "Create app"
3. Choose "Create app manually"
4. Name your app "UnderItAll Tools"
5. Copy the Client ID and update `shopify.app.toml`

## Step 2: Build Extension Bundles

Build the React components into standalone JavaScript bundles:

```bash
npm run build:extensions
```

This command:
- Bundles the calculator React component → `extensions/underitall-blocks/assets/calculator-block.js`
- Bundles the chat React component → `extensions/underitall-blocks/assets/chat-block.js`
- Includes all dependencies in IIFE format for Shopify compatibility
- Outputs brand assets to `extensions/underitall-blocks/assets/brand/`

## Step 3: Deploy to Shopify

### Using Shopify CLI

1. **Log in to Shopify CLI:**
   ```bash
   shopify auth login
   ```

2. **Deploy the app:**
   ```bash
   shopify app deploy
   ```

3. **Confirm deployment:**
   - Review the extensions that will be deployed
   - Confirm to publish

### What Gets Deployed

- **Calculator Theme Block**: Available in Theme Customizer under "Apps"
- **Chat Assistant Block**: Available as a floating widget block
- Both blocks include:
  - Liquid templates
  - JavaScript bundles
  - CSS with UnderItAll brand styling
  - Localization files

## Step 4: Install App on Your Store

1. After deployment, Shopify CLI will provide an installation URL
2. Open the URL in your browser
3. Select your development store
4. Click "Install app"
5. Grant the requested permissions

## Step 5: Add Blocks to Your Theme

### Adding the Calculator Block

1. Go to **Online Store → Themes**
2. Click **Customize** on your active theme
3. Navigate to the page where you want the calculator (e.g., a custom "Calculator" page)
4. Click **Add section** or **Add block**
5. Under "Apps", find "UnderItAll Calculator"
6. Add it to your page
7. Configure settings:
   - **API URL**: `https://underitall-tools.replit.app`
   - **Heading**: "Custom Rug Pad Calculator"
   - **Description**: Optional description text

### Adding the Chat Assistant Block

1. In the Theme Customizer
2. Navigate to your theme settings or homepage
3. Click **Add block** → "Apps" → "UnderItAll Chat Assistant"
4. Configure settings:
   - **API URL**: Your Replit app URL
   - **Position**: Bottom Right or Bottom Left
   - **Enabled**: Toggle on/off

The chat bubble will appear on all pages where the block is active.

## Block Settings

### Calculator Block Settings

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| API URL | Text | Your Replit backend URL | `https://underitall-tools.replit.app` |
| Heading | Text | Calculator heading | "Custom Rug Pad Calculator" |
| Description | Textarea | Description text | Pre-filled |
| Show Description | Checkbox | Toggle description | true |

### Chat Assistant Settings

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| API URL | Text | Your Replit backend URL | `https://underitall-tools.replit.app` |
| Position | Select | Bottom Right / Bottom Left | Bottom Right |
| Enabled | Checkbox | Enable/disable chat | true |

## Brand Styling

Both blocks follow UnderItAll brand guidelines:

### Colors
- **Rorange**: `#F2633A` - Primary accent, CTAs
- **Felt Gray**: `#696A6D` - Secondary elements
- **Greige**: `#E1E0DA` - Borders, backgrounds
- **Soft Black**: `#212227` - Text
- **Cream**: `#F3F1E9` - Background
- **White**: `#FFFFFF` - Cards, inputs

### Typography
- **Archivo**: Headlines and headings (600-700 weight)
- **Lora Italic**: Accent text and features (400 weight)
- **Vazirmatn**: Body text and forms (400-600 weight)

### Design System
- **Border Radius**: 11px (small), 16px (medium), 22px (large)
- **Spacing**: 8px, 12px, 16px, 24px, 32px increments
- **Mobile-first**: Fully responsive design

All styling is self-contained in the CSS files and won't conflict with your theme.

## Testing the Blocks

### Test Calculator Block

1. Visit the page where you added the calculator
2. Enter custom dimensions (e.g., 8' x 10')
3. Select thickness (Luxe Lite ⅛" or Luxe ¼")
4. Choose shape (Rectangle, Round, Square, Free Form)
5. Verify real-time pricing updates
6. Test "Add to Cart" or "Create Draft Order" buttons

### Test Chat Assistant

1. Click the floating chat bubble
2. Type a question: "What rug pad thickness should I use?"
3. Verify GPT-5 powered responses
4. Test conversation history persistence
5. Ask about products and pricing

## Updating the Blocks

When you make changes to the calculator or chat components:

1. **Update the code** in `client/src/pages/calculator.tsx` or `client/src/components/chat-bubble.tsx`
2. **Rebuild extensions:**
   ```bash
   npm run build:extensions
   ```
3. **Redeploy to Shopify:**
   ```bash
   shopify app deploy
   ```
4. **Refresh your store** - Theme blocks update automatically

## Advanced Configuration

### Custom API Endpoints

If your Replit app URL changes, update the API URL in the block settings:

1. Theme Customizer → Select the block
2. Update "API URL" setting
3. Save changes

### Environment Variables

Set these environment variables in your Replit app:

```bash
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxxxx
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
```

These enable:
- Draft order creation from calculator
- Product search in chat assistant
- Shopify integration features

## Troubleshooting

### Block Not Appearing in Theme Customizer

**Issue**: Can't find UnderItAll blocks in Theme Customizer

**Solutions**:
1. Verify app is deployed: `shopify app deploy`
2. Ensure app is installed on your store
3. Try refreshing the Theme Customizer
4. Check Shopify CLI output for deployment errors

### JavaScript Not Loading

**Issue**: Calculator or chat doesn't render

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify API URL is correct in block settings
3. Ensure Replit app is running and deployed
4. Check that `calculator-block.js` and `chat-block.js` exist in assets folder

### CORS Errors

**Issue**: Browser shows CORS policy errors

**Solutions**:
1. Verify your Replit app allows requests from Shopify domains
2. Check Express CORS configuration in `server/index.ts`
3. Ensure API URL matches your deployed Replit domain

### Pricing Not Calculating

**Issue**: Calculator shows "Calculating..." but never updates

**Solutions**:
1. Check that price matrix JSON files exist in `server/utils/`
2. Verify API endpoint `/api/calculator/calculate` is working
3. Test the endpoint directly in browser or Postman
4. Review server logs for errors

### Chat Not Responding

**Issue**: Chat sends messages but doesn't get responses

**Solutions**:
1. Verify OpenAI integration is configured (automatic via Replit)
2. Check environment variables for AI integration
3. Review server logs for API errors
4. Test `/api/chat/message` endpoint

## Production Deployment

### Replit Deployment

1. Click **Deploy** button in Replit
2. Your app will be available at: `https://your-app.replit.app`
3. Update all block settings with the production URL
4. Redeploy Shopify app with updated URLs

### Custom Domain (Optional)

To use your own domain:

1. In Replit, go to Deployments → Custom Domain
2. Add your domain (e.g., `tools.underitall.com`)
3. Update DNS records as instructed
4. Update `shopify.app.toml` with new domain
5. Redeploy: `shopify app deploy`

## Security Considerations

- **API Keys**: All Shopify credentials stored as environment variables
- **Session Security**: Uses secure session cookies
- **Input Validation**: All API endpoints validate input with Zod schemas
- **CORS**: Configured to allow Shopify domains only
- **HTTPS**: Required for Shopify app blocks

## Performance

- **Lazy Loading**: JavaScript bundles load only when blocks are used
- **Caching**: Static assets served with cache headers
- **Optimized Bundles**: Vite tree-shaking removes unused code
- **CDN**: Shopify serves assets via CDN automatically

## Support

### Documentation
- Main integration guide: `SHOPIFY_INTEGRATION.md`
- Project documentation: `replit.md`
- Design guidelines: `design_guidelines.md`

### Common Issues
- Extensions not deploying → Ensure Shopify CLI is up to date
- Blocks not syncing → Clear Theme Customizer cache
- JavaScript errors → Check browser console and server logs

### Getting Help
1. Review the troubleshooting section above
2. Check Shopify CLI output for error messages
3. Review server logs in Replit
4. Consult Shopify Theme App Extension documentation

## Next Steps

1. ✅ Deploy your Replit app
2. ✅ Configure `shopify.app.toml` with your client ID
3. ✅ Build extension bundles: `npm run build:extensions`
4. ✅ Deploy to Shopify: `shopify app deploy`
5. ✅ Install app on your development store
6. ✅ Add blocks to your theme in Theme Customizer
7. ✅ Test all functionality
8. ✅ Deploy to production store

## Resources

- [Shopify Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Shopify CLI Documentation](https://shopify.dev/docs/apps/tools/cli)
- [Replit Deployment Guide](https://docs.replit.com/hosting/deployments)
- [UnderItAll Brand Guidelines](design_guidelines.md)

---

**Built with Replit Agent**  
**Last Updated**: October 19, 2025  
**Version**: 1.0.0