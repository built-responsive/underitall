
# UnderItAll Shopify Tools

> **Custom perforated rug pads. Made for designers.**

A unified Shopify application delivering wholesale registration, intelligent rug pad calculation, and AI-powered customer assistance—built for the trade, engineered for elegance.

---

## 🎯 Overview

UnderItAll Shopify Tools provides a complete suite of trade-focused features:

- **Wholesale Registration & Onboarding** – Credential verification, admin approval workflow, and seamless account creation
- **Rug Pad Calculator** – Real-time pricing engine with custom sizing (2-40 ft), supporting Rectangle, Round, Square, and Free Form shapes
- **AI-Powered Chat Assistant** – GPT-5 conversational shopping experience with product recommendations
- **Admin Dashboard** – Full-featured management console for registrations, quotes, and draft orders
- **CRM Integration** – Automated account and contact creation in Clarity CRM
- **Shopify Integration** – Metaobject-based wholesale accounts, customer creation, and draft order generation

**Built with:** React + TypeScript, Express.js, PostgreSQL, OpenAI GPT-5  
**Deployed on:** Replit  
**Production URL:** `https://underitall-tools.replit.app`

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 18 + TypeScript
- Wouter (routing)
- Tailwind CSS + Shadcn UI
- TanStack Query v5 (data fetching)
- React Hook Form + Zod (validation)

**Backend**
- Express.js
- PostgreSQL (Neon-backed)
- Drizzle ORM
- OpenAI GPT-5 (via Replit AI Integrations)

**Design System**
- **Color Palette:** Rorange (#F2633A), Greige (#E1E0DA), Felt Gray (#696A6D), Soft Black (#212227), Cream (#F3F1E9)
- **Typography:** Archivo (headlines), Lora Italic (accents), Vazirmatn (body/forms)
- **Border Radius:** 11px (small), 16px (medium), 22px (large)
- **Spacing Scale:** 8px, 12px, 16px, 24px, 32px increments

See [`BRAND_GUIDELINES.md`](BRAND_GUIDELINES.md) for complete visual identity specifications.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (auto-configured on Replit)
- Shopify Partner account (for theme app blocks)
- Environment variables configured

### Installation

```bash
# Clone or fork on Replit
git clone <repository-url>

# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:5000` (or your Replit URL).

### Environment Variables

Create a `.env` file with the following:

```bash
# Database (auto-configured on Replit)
DATABASE_URL="postgresql://..."

# Shopify Integration
SHOPIFY_SHOP_DOMAIN="your-store.myshopify.com"
SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_xxxxx"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="xxxxx"

# CRM Integration
CRM_BASE_URL="https://claritymobileapi.claritycrm.com"
CRM_API_KEY="underitall-key-xxxxx"

# OpenAI (auto-configured via Replit AI Integrations)
AI_INTEGRATIONS_OPENAI_API_KEY="sk-xxxxx"
AI_INTEGRATIONS_OPENAI_BASE_URL="https://..."

# Session Security (auto-generated)
SESSION_SECRET="xxxxx"
```

---

## 📂 Project Structure

```
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # Shadcn components
│   │   │   ├── chat-bubble.tsx
│   │   │   └── navigation.tsx
│   │   ├── pages/            # Route pages
│   │   │   ├── calculator.tsx
│   │   │   ├── wholesale-registration.tsx
│   │   │   └── admin.tsx
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities
│   │   └── index.css         # Brand styles
│   └── public/brand/         # UnderItAll assets
│
├── server/                   # Express backend
│   ├── utils/
│   │   ├── pricingCalculator.ts  # Core pricing engine
│   │   ├── openai.ts             # GPT-5 integration
│   │   ├── priceBreakMap_Thin.json
│   │   └── priceBreakMap_Thick.json
│   ├── routes.ts             # API endpoints
│   ├── storage.ts            # Database interface
│   └── db.ts                 # Drizzle ORM setup
│
├── shared/                   # Shared TypeScript types
│   └── schema.ts             # Database schemas
│
├── extensions/               # Shopify Theme App Blocks
│   └── underitall-blocks/
│       ├── blocks/           # Liquid templates
│       ├── assets/           # JS/CSS bundles
│       └── shopify.extension.toml
│
├── migrations/               # Database migrations
│
├── BRAND_GUIDELINES.md       # Visual identity specs
├── SHOPIFY_INTEGRATION.md    # Integration guide
├── SHOPIFY_APP_BLOCKS.md     # Theme blocks setup
└── replit.md                 # Development docs
```

---

## 🧮 Features Deep Dive

### 1. Wholesale Registration

**What it does:**
- Collects business credentials (firm name, contact, address, tax ID)
- Supports file uploads for certifications and tax documentation
- Admin approval workflow with notes and rejection reasons
- Automated Shopify metaobject and customer creation
- CRM integration (Clarity CRM) for account and contact creation

**Routes:**
- Registration form: `/wholesale-registration`
- Admin dashboard: `/admin`

**API Endpoints:**
```
POST   /api/wholesale-registration          # Submit application
GET    /api/wholesale-registrations         # List all (admin)
PATCH  /api/wholesale-registration/:id      # Approve/reject
POST   /api/wholesale-registration/:id/create-shopify-account
```

**Shopify Integration:**
- Creates `wholesale_account` metaobject with business details
- Creates Shopify customer with metaobject reference
- Tags customers as `wholesale, trade-program`

**CRM Integration:**
- Creates Clarity CRM Account with business info
- Creates Contact linked to Account
- Uploads tax/VAT proof as attachment

---

### 2. Rug Pad Calculator

**What it does:**
- Real-time pricing based on CSV-sourced matrices (⅛" and ¼" thickness)
- Custom sizing: 2-40 feet (whole numbers + separate inches 0-11)
- 4 shape options: Rectangle, Round, Square, Free Form
- Instant quote preview with price/sqft, area, total
- Shopify draft order creation with detailed line items
- Quote persistence for admin analytics

**Routes:**
- Calculator interface: `/calculator`

**API Endpoints:**
```
POST   /api/calculator/calculate            # Calculate pricing (no save)
POST   /api/calculator/quote                # Save quote
GET    /api/calculator/quotes               # All quotes (admin)
POST   /api/draft-order                     # Create Shopify draft order
```

**Pricing Engine:**
- Loads matrices from `priceBreakMap_Thin.json` and `priceBreakMap_Thick.json`
- Uses `lookupPrice()` function with interpolation for intermediate sizes
- Supports all shape calculations (Rectangle, Round, Square, Free Form)
- Real-time updates via React `useEffect`

**Draft Order Creation:**
- Formatted dimensions in feet'inches" notation
- Custom properties for Project Name, PO Number, Client Name
- Direct link to Shopify Admin for order management

---

### 3. AI Chat Assistant

**What it does:**
- Floating chat bubble on all pages
- Powered by OpenAI GPT-5 (newest model)
- Answers rug pad questions, provides sizing guidance
- Maintains conversation history across sessions
- Product recommendations and installation tips

**Component:** `client/src/components/chat-bubble.tsx`

**API Endpoints:**
```
POST   /api/chat/conversation               # Create conversation
POST   /api/chat/message                    # Send message & get AI response
GET    /api/chat/conversation/:id/messages  # Get history
```

**System Prompt:**
The chat uses a custom system prompt that positions the AI as a knowledgeable rug pad expert, familiar with:
- UnderItAll's Luxe Lite (⅛") and Luxe (¼") products
- Perforated edge technology
- Custom sizing and installation guidance
- Trade-only exclusivity

---

### 4. Admin Dashboard

**What it does:**
- Registration approval/rejection workflow
- Calculator quote analytics
- Draft order management with Shopify links
- CSV settings for pricing matrix updates
- Expandable registration cards with full details

**Routes:**
- Dashboard: `/admin`

**Features:**
- Pending/approved/rejected registration filtering
- Inline file links for certifications
- One-click Shopify account creation
- CRM sync status tracking
- Collapsible card UI with detailed views

---

## 🎨 Brand Styling

### Navigation

The application features a sticky navigation header:
- **Auto-hides in Shopify iframes** (detects `window !== window.top`)
- **Responsive design:** Icon-only on mobile (<640px), full text on desktop
- **Positioned:** `top-0` with `z-50` to stay above all content

### Calculator Sticky Header

The calculator includes a sticky orange header below navigation:
- **Dynamic shape thumbnail** – Updates when shape selection changes
- **Large white total price** – Prominent display for trade professionals
- **Condensed quote details** – Dimensions (feet'inches"), area, price/sqft, thickness, quantity
- **Action buttons:** Save Quote, Create Draft Order
- **Positioned:** `top-16` (below nav) with `z-40`

### Color Usage

- **Rorange (#F2633A):** Primary CTAs, accents, active states
- **Greige (#E1E0DA):** Borders, dividers, subtle backgrounds
- **Felt Gray (#696A6D):** Secondary text, disabled states
- **Soft Black (#212227):** Primary text, headers
- **Cream (#F3F1E9):** Page backgrounds, cards

### Typography

- **Archivo:** Headlines (600-700 weight) – Confident, modern
- **Lora Italic:** Feature text, accents (400 weight) – Elegant, distinctive
- **Vazirmatn:** Body text, forms (400-500 weight) – Clean, readable

---

## 🔗 Shopify Integration

### Theme App Blocks

Deploy calculator and chat as drag-and-drop theme blocks:

```bash
# Build extension bundles
npm run build:extensions

# Deploy to Shopify
shopify app deploy
```

See [`SHOPIFY_APP_BLOCKS.md`](SHOPIFY_APP_BLOCKS.md) for complete setup instructions.

### Configuration

Update `shopify.app.toml` with your credentials:

```toml
client_id = "your-app-client-id"
name = "UNDERITALL TOOLS"
application_url = "https://your-app.replit.app"
embedded = true

[auth]
redirect_urls = [
  "https://your-app.replit.app",
  "https://your-app.replit.app/auth/callback"
]

[access_scopes]
scopes = "write_customers,write_draft_orders,write_metaobjects,read_products"
```

### Metaobject Schema

The `wholesale_account` metaobject includes:
- `company` (text)
- `email` (text)
- `phone` (text)
- `website` (text)
- `instagram` (text)
- `source` (text)
- `message` (text)
- `sample_set` (boolean)
- `tax_exempt` (boolean)
- `vat_tax_id` (text)

---

## 📊 Database Schema

All tables defined in [`shared/schema.ts`](shared/schema.ts):

**Core Tables:**
- `wholesaleRegistrations` – Business applications
- `calculatorQuotes` – Saved pricing quotes
- `draftOrders` – Shopify draft order tracking
- `chatConversations` – Chat session tracking
- `chatMessages` – Conversation history

**Migrations:**
- `0001_add_missing_columns.sql` – Initial schema setup
- `0002_add_registration_fields.sql` – Registration enhancements

---

## 🛠️ Development

### Running Locally

```bash
# Start development server
npm run dev
```

This starts:
- Express backend on port 5000
- Vite dev server with HMR
- PostgreSQL database connection

### Updating Price Matrices

1. Export updated pricing from Google Sheets as CSV
2. Convert to JSON format
3. Replace `server/utils/priceBreakMap_Thin.json` and `priceBreakMap_Thick.json`
4. Redeploy

Or use the Admin Dashboard CSV settings to update URLs (production feature).

### Database Migrations

```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate
```

---

## 🚢 Deployment

### Replit Deployment

1. Click **Deploy** button in Replit
2. Your app will be available at: `https://your-app.replit.app`
3. Update Shopify app URLs in `shopify.app.toml`
4. Redeploy Shopify app: `shopify app deploy`

### Custom Domain (Optional)

1. In Replit: Deployments → Custom Domain
2. Add your domain (e.g., `tools.underitall.com`)
3. Update DNS records as instructed
4. Update all URLs in `shopify.app.toml`

---

## 📖 Documentation

- **[BRAND_GUIDELINES.md](BRAND_GUIDELINES.md)** – Official visual identity and design system
- **[SHOPIFY_INTEGRATION.md](SHOPIFY_INTEGRATION.md)** – Complete Shopify integration guide
- **[SHOPIFY_APP_BLOCKS.md](SHOPIFY_APP_BLOCKS.md)** – Theme app blocks deployment
- **[design_guidelines.md](design_guidelines.md)** – UI/UX implementation specs
- **[replit.md](replit.md)** – Development and feature documentation

---

## 🔒 Security

- **API Keys:** Stored as environment variables (never committed)
- **Session Security:** Encrypted session cookies
- **Input Validation:** All API endpoints use Zod schemas
- **CORS:** Configured for Shopify domains only
- **HTTPS:** Required for Shopify app blocks (automatic on Replit)

---

## 🧪 Testing

End-to-end testing checklist:

**Wholesale Registration:**
- ✅ Submit application with all fields
- ✅ Upload certification and tax ID files
- ✅ Admin approval workflow
- ✅ Shopify metaobject creation
- ✅ CRM account and contact creation

**Calculator:**
- ✅ Real-time pricing updates (test 8'×10' → 12'×10')
- ✅ All shape calculations (Rectangle, Round, Square, Free Form)
- ✅ Draft order creation
- ✅ Quote persistence

**Chat Assistant:**
- ✅ GPT-5 responses
- ✅ Conversation history persistence
- ✅ Product recommendations

---

## 📝 API Reference

### Calculator

**Calculate Price**
```http
POST /api/calculator/calculate
Content-Type: application/json

{
  "width": 8,
  "length": 10,
  "thickness": "thin",
  "quantity": 1
}
```

**Create Draft Order**
```http
POST /api/draft-order
Content-Type: application/json

{
  "quoteId": "uuid",
  "customerInfo": {
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Wholesale Registration

**Submit Application**
```http
POST /api/wholesale-registration
Content-Type: application/json

{
  "firmName": "Design Firm",
  "contactName": "John Doe",
  "email": "john@designfirm.com",
  "phone": "+1234567890",
  "businessAddress": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "businessType": "design_firm",
  "isTaxExempt": true,
  "taxId": "12-3456789",
  "accountPassword": "securePassword123"
}
```

**Approve/Reject**
```http
PATCH /api/wholesale-registration/:id
Content-Type: application/json

{
  "status": "approved",
  "adminNotes": "Verified credentials"
}
```

### Chat

**Send Message**
```http
POST /api/chat/message
Content-Type: application/json

{
  "conversationId": "uuid",
  "content": "What thickness should I use?",
  "sessionId": "session-uuid"
}
```

---

## 🤝 Contributing

This is a proprietary application for UnderItAll. Internal development only.

---

## 📄 License

Proprietary – UnderItAll, Inc.

---

## 🆘 Support

For technical issues or feature requests:
1. Review documentation in `docs/`
2. Check Replit console for errors
3. Review Shopify API logs
4. Contact: **dev@underitall.com**

---

## 🎯 Roadmap

**Planned Enhancements:**
- [ ] Customer account portal with order history
- [ ] Automated email notifications for approvals
- [ ] Admin bulk operations for draft orders
- [ ] Persistent chat history with recommendations
- [ ] Real-time inventory integration
- [ ] Multi-currency support for international trade
- [ ] Advanced analytics dashboard

---

**Built with ❤️ on Replit**  
**Version:** 1.0.0 MVP  
**Last Updated:** October 2025

---

*Custom perforated rug pads. Made for designers.*
