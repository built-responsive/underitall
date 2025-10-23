
# 🧾 Draft Order Setup Guide

## What This Does
Creates custom-priced Draft Orders in Shopify (works on Basic plan) with all your custom rug pad properties.

## Required Shopify Credentials

You need to set these in **Replit Secrets** (🔒 Tools → Secrets):

### 1. `SHOPIFY_SHOP`
Your shop domain (without https://)
```
Example: underitall-redeux.myshopify.com
```

### 2. `SHOPIFY_ACCESS_TOKEN`
Your Admin API access token with these permissions:
- `write_draft_orders`
- `read_products`

### How to Get Your Access Token:

1. Go to **Shopify Admin → Apps → App and sales channel settings**
2. Click **Develop apps**
3. Click **Create an app** (name it "UnderItAll Calculator")
4. Go to **Configuration** tab
5. Under **Admin API access scopes**, enable:
   - `write_draft_orders`
   - `read_products`
6. Click **Save**
7. Go to **API credentials** tab
8. Click **Install app**
9. Copy the **Admin API access token** (starts with `shpat_`)
10. Add to Replit Secrets as `SHOPIFY_ACCESS_TOKEN`

## How It Works

1. Customer fills out custom rug pad form
2. Clicks "Add to Cart"
3. App creates Draft Order with:
   - Custom unit price (calculated from dimensions)
   - All project metadata (Project, Location, PO#, Firm)
   - Dimension details with emojis for easy reading
4. Redirects to Draft Order invoice for payment
5. All data appears in Shopify order admin

## Testing

1. Set up secrets (above)
2. Run the app
3. Fill out the form on a product page
4. Click "Add to Cart"
5. Should redirect to invoice URL
6. Check Shopify admin → Draft Orders to see the custom order

## Properties Included

Each Draft Order line item includes:
- 📐 Dimensions (formatted with feet/inches)
- 📏 Total Sq Ft
- 💰 Unit Price (per item)
- 💵 Total Price (unit × quantity)
- 📊 Price/Sq Ft
- 🏢 Project Name
- 📍 Install Location
- 📄 PO Number
- 👤 Design Firm/Attn
- 🎨 Product (variant title)

*All properties are visible in Shopify admin and customer order confirmation.*
