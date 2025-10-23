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
- **Customer Account Extension** – Self-service wholesale account management portal

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

See [`docs/BRAND_GUIDELINES.md`](docs/BRAND_GUIDELINES.md) for complete visual identity specifications.

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
│   ├── webhooks.ts           # Webhook handlers
│   └── db.ts                 # Drizzle ORM setup
│
├── shared/                   # Shared TypeScript types
│   └── schema.ts             # Database schemas
│
├── extensions/               # Shopify Extensions
│   ├── underitall-blocks/    # Theme app blocks
│   │   ├── blocks/           # Liquid templates
│   │   ├── assets/           # JS/CSS bundles
│   │   └── shopify.extension.toml
│   └── wholesale-account-profile/  # Customer account extension
│       ├── src/ProfileBlock.jsx
│       └── shopify.extension.toml
│
├── docs/                     # Documentation
│   ├── BRAND_GUIDELINES.md
│   ├── ONBOARD_FLOW.md
│   ├── SHOPIFY_INTEGRATION.md
│   └── SHOPIFY_APP_BLOCKS.md
│
└── AGENT.md                  # AI agent instructions
```

---

## 🧮 Features Deep Dive

### 1. Wholesale Registration & Onboarding

**Complete Flow Architecture:**

**Phase 1: Application Submission** (`/wholesale-registration`)
- Business information collection (company, address, contact)
- AI-powered company enrichment (auto-fills website, Instagram, address)
- Tax exemption documentation upload (PDF/JPG/PNG, 50MB max)
- EIN format validation (`XX-XXXXXXX` or `NA`)
- Stored in PostgreSQL with `pending` status

**Phase 2: Admin Approval** (`/admin` dashboard)
- Review business credentials and tax documents
- Approve/reject with admin notes
- Triggers automated Shopify + CRM account creation

**Phase 3: Shopify Integration** (Source of Truth)
- **Metaobject Creation**: `wholesale_account` type via GraphQL
  - Fields: company, email, phone, website, instagram, address (full), tax_exempt, vat_tax_id, clarity_id, owner
- **Customer Creation**: REST API (Basic plan compatible)
  - Bidirectional reference via `custom.wholesale_account` metafield
  - Tags: `wholesale, trade-program, {business_type}`

**Phase 4: CRM Synchronization** (Clarity CRM)
- **Account Creation**: Maps metaobject → CRM Account
- **Contact Creation**: Maps customer → CRM Contact (linked to Account)
- **Attachment Upload**: Tax ID proof → CRM attachment
- **Saves `clarity_id`** back to Shopify metaobject

**Phase 5: Webhook-Driven Sync**
- `metaobjects/update` → Syncs to CRM Account
- `customers/update` → Syncs to CRM Contact
- Bidirectional confirmation webhooks from Clarity CRM

**API Endpoints:**
```
POST   /api/wholesale-registration          # Submit application
GET    /api/wholesale-registrations         # List all (admin)
PATCH  /api/wholesale-registration/:id      # Approve/reject
POST   /api/wholesale-registration/:id/create-shopify-account
POST   /api/webhooks/metaobjects/update     # Shopify webhook
POST   /api/webhooks/customers/update       # Shopify webhook
POST   /api/webhooks/clarity/account_create # CRM webhook
```

---

### 2. Customer Account Extension (Self-Service Portal)

**Location:** `extensions/wholesale-account-profile/`  
**Target:** `customer-account.profile.block.render`  
**API Version:** 2025-10

**Features:**
- Fetches customer's `custom.wholesale_account` metafield reference
- Queries metaobject to display all wholesale account fields
- Editable form fields with real-time validation
- Update API: `PATCH /api/wholesale-account/:metaobjectId`
- Success/error banners with auto-dismiss (5 seconds)

**Customer Experience:**
1. Navigate to Shopify customer account profile
2. See "Wholesale Account Information" card
3. Edit fields directly (company, email, phone, address, tax info)
4. Click "Update Account" button
5. See success message confirming update
6. Changes immediately reflected in Shopify Admin

**Editable Fields:**
- Company Name, Email, Phone
- Website, Instagram
- Street Address, Suite/Unit, City, State, ZIP
- VAT/Tax ID, Tax Exempt Status
- Source, Additional Message

**Technical Implementation:**
- React components from `@shopify/ui-extensions-react/customer-account`
- Storefront API queries for metaobject data
- Admin API mutations for updates
- Session token authentication

---

### 3. Rug Pad Calculator

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

---

### 4. AI Chat Assistant

**What it does:**
- Floating chat bubble on all pages
- Powered by OpenAI GPT-5 (newest model)
- Answers rug pad questions, provides sizing guidance
- Maintains conversation history across sessions
- Product recommendations and installation tips
- **Enhanced with wholesale onboarding knowledge**

**Component:** `client/src/components/chat-bubble.tsx`

**API Endpoints:**
```
POST   /api/chat/conversation               # Create conversation
POST   /api/chat/message                    # Send message & get AI response
GET    /api/chat/conversation/:id/messages  # Get history
```

---

## 🔗 Shopify Integration

### Metaobject Schema (`wholesale_account`)

Complete field structure:
```typescript
{
  company: string;
  email: string;
  phone: string;
  website?: string;
  instagram?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  vat_tax_id: string;
  tax_exempt: boolean;
  source: string;
  message?: string;
  account_type: string[];
  sample_set: boolean;
  tax_proof?: string; // GenericFile GID
  clarity_id?: string; // CRM Account ID
  owner: string[]; // Customer GIDs
}
```

### Webhook Configuration

**Shopify → Our App:**
- `metaobjects/update` (filter: `type:wholesale_account`)
- `customers/update`

**Clarity CRM → Our App:**
- Account create/update confirmations
- Contact create/update confirmations

---

## 📖 Documentation

- **[docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md)** – Official visual identity and design system
- **[docs/SHOPIFY_INTEGRATION.md](docs/SHOPIFY_INTEGRATION.md)** – Complete Shopify integration guide
- **[docs/ONBOARD_FLOW.md](docs/ONBOARD_FLOW.md)** – Detailed wholesale onboarding flow
- **[docs/SHOPIFY_APP_BLOCKS.md](docs/SHOPIFY_APP_BLOCKS.md)** – Theme app blocks deployment
- **[AGENT.md](AGENT.md)** – AI agent system knowledge

---

## 🧪 Testing

**Wholesale Registration:**
- ✅ Submit application with all fields
- ✅ AI-powered company enrichment
- ✅ Upload tax ID documentation
- ✅ Admin approval workflow
- ✅ Shopify metaobject creation
- ✅ Shopify customer creation (with metafield reference)
- ✅ CRM account and contact creation
- ✅ Tax proof attachment upload to CRM
- ✅ Webhook synchronization (Shopify ↔ CRM)

**Customer Account Extension:**
- ✅ Extension renders on customer profile page
- ✅ Fetches metaobject data via metafield reference
- ✅ Form fields populate with current values
- ✅ Update API endpoint works correctly
- ✅ Success/error banners display appropriately
- ✅ Changes reflected in Shopify Admin immediately

---

## 🔒 Security

- **API Keys:** Stored as environment variables (never committed)
- **Webhook Verification:** HMAC-SHA256 signature validation
- **Session Security:** Encrypted session cookies
- **Input Validation:** All API endpoints use Zod schemas
- **CORS:** Configured for Shopify domains only
- **HTTPS:** Required for Shopify app blocks (automatic on Replit)

---

## 🎯 Roadmap

**Planned Enhancements:**
- [ ] Bidirectional CRM sync (CRM → Shopify metaobject updates)
- [ ] Customer account portal with order history
- [ ] Automated email notifications for approvals
- [ ] Admin bulk operations for draft orders
- [ ] Real-time inventory integration
- [ ] Multi-currency support for international trade
- [ ] Advanced analytics dashboard

---

**Built with ❤️ on Replit**  
**Version:** 1.0.0 MVP  
**Last Updated:** January 2025

---

*Custom perforated rug pads. Made for designers.*