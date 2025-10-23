
# UnderItAll - Shopify Rug Pad Application

## Overview
The UnderItAll project is an AI-powered Shopify application designed for a premium custom rug pad manufacturer. It targets design professionals, contractors, and retail customers, aiming to streamline operations and enhance the customer experience. Key capabilities include a real-time rug pad calculator, a robust wholesale registration system, and an AI-powered chat assistant for conversational commerce. The project leverages a modern tech stack including React, Express.js, PostgreSQL, and integrates deeply with Shopify APIs and AI services (OpenAI GPT-5, Shopify MCP). The business vision is to provide a seamless, efficient, and intelligent platform for custom rug pad ordering and customer engagement, significantly improving sales and operational efficiency in a specialized market.

## User Preferences
Every code edit, file change, configuration update, or system modification MUST include a changelog entry in `CHANGELOG.md` using a specified format. This ensures full traceability, auditing, and collaborative AI transparency.

## System Architecture

### UI/UX Decisions
- **Color Palette:** Primary Rorange (#F2633A), Greige (#E1E0DA), Felt Gray (#696A6D), Soft Black (#212227), Cream (#F3F1E9).
- **Typography:** Headlines: Archivo, Accent: Lora Italic, Body: Vazirmatn.
- **Border Radius:** 11px (small), 16px (medium), 22px (large).
- **Spacing:** Increments of 8px, 12px, 16px, 24px, 32px.
- **Components:** Shadcn UI with custom theming.
- **Navigation:** Sticky header with UnderItAll logo, navigation buttons (Calculator, Wholesale Registration, Dashboard), responsive design, auto-hides when embedded in Shopify blocks.
- **Calculator UI:** Sticky orange header displaying dynamic shape thumbnail, total price, condensed quote details, and action buttons (Save Quote, Create Draft Order).

### Technical Implementations
- **Frontend:** React 18, TypeScript, Wouter for routing, Tailwind CSS, Shadcn UI, TanStack Query v5 for state management, React Hook Form + Zod for forms.
- **Backend:** Express.js, PostgreSQL (Neon-backed), Drizzle ORM.
- **AI:** OpenAI GPT-5 via Replit AI Integrations, Shopify Dev MCP, Shopify Storefront MCP.
- **Wholesale Registration:** Complete business credential verification, trade license upload, Shopify Metaobject integration (`custom.wholesale_account`), Clarity CRM sync, admin approval workflow.
- **Rug Pad Calculator:** Real-time pricing based on CSV-based price break matrices, custom sizing (feet and inches), 4 shape options (Rectangle, Round, Square, Free Form), 2 thickness options (Luxe Lite, Luxe), live quote preview, Shopify Draft Order creation.
- **AI-Powered Chat Assistant:** Floating chat bubble, Shopify Storefront MCP for live product/customer data, GPT-5 powered with custom system prompt, persistent conversation history in PostgreSQL, product recommendations.
- **Admin Dashboard:** Wholesale registration approval/rejection, Shopify Customer Account creation, Clarity CRM integration, calculator usage analytics, draft order management.

### Feature Specifications
- **Wholesale Registration:** `/wholesale-registration` route, `POST /api/wholesale-registration` API, creates Shopify metaobject and customer account on approval.
- **Rug Pad Calculator:** `/calculator` route, `POST /api/calculator/calculate` API for quotes, `POST /api/calculator/draft-order` for Shopify draft orders. Utilizes `server/utils/pricingCalculator.ts` and JSON price matrices.
- **AI Chat Assistant:** `client/src/components/chat-bubble.tsx` component, `POST /api/chat/message` API, integrates Shopify Storefront MCP for commerce data via `server/utils/openai.ts`.
- **Shopify Theme App Blocks:** Calculator Block and Chat Assistant Block for embeddable functionality.

### System Design Choices
- **Database Schema:** Defined in `shared/schema.ts`, includes tables for wholesaleRegistrations, calculatorQuotes, chatConversations, chatMessages, draftOrders, and adminUsers.
- **API Endpoints:** Structured for Calculator, Wholesale Registration, Chat Assistant, Shopify Integration (metaobject/customer creation, product search), and CRM Integration.
- **Project Structure:** Clear separation of client, server, and shared code, with dedicated directories for components, pages, utilities, and Shopify extensions.
- **Modularity:** Pricing logic (`pricingCalculator.ts`), OpenAI integration (`openai.ts`), and Shopify API client (`shopify.ts`) are encapsulated in utility files.

## External Dependencies
- **PostgreSQL:** Database for data persistence (Neon-backed).
- **OpenAI GPT-5:** AI model for the chat assistant, integrated via Replit AI Integrations.
- **Shopify APIs:**
    - **Shopify Admin API:** Used for creating draft orders, managing customers, and integrating metaobjects.
    - **Shopify Storefront API:** Accessed via Shopify Storefront MCP for real-time product catalog, customer accounts, order lookup, and cart operations.
- **Shopify MCP (Managed Compute Platform):**
    - **Shopify Dev MCP Server:** Provides direct access to Shopify API schemas, documentation, and Functions for AI assistance during development.
    - **Shopify Storefront MCP Server:** Connects AI assistants to live commerce data for customer-facing experiences.
- **Clarity CRM:** Integration for automatic account, contact, and attachment synchronization with wholesale registrations.
- **Shopify UI Extensions:** Version 2025.7.1 - For building customer account UI extensions (`@shopify/ui-extensions` and `@shopify/ui-extensions-react`)

## Shopify Extensions

### Wholesale Account Profile Extension
Located in `extensions/wholesale-account-profile/`, this Shopify Customer Account UI Extension displays wholesale account information on the customer profile page.

**Extension Details:**
- **Target:** `customer-account.profile.block.render` (appears on customer profile page)
- **File:** `src/ProfileBlock.jsx`
- **API Version:** 2025-10

**Features:**
- Fetches customer's `custom.wholesale_account` metafield reference
- Queries the metaobject to display all wholesale account fields
- Displays business information (company, email, phone, website, Instagram)
- Shows address details (street, city, state, ZIP)
- Displays tax information (VAT/Tax ID, tax exempt status)
- Shows additional information (source, message, account type)
- Editable form fields for updating wholesale account data

**Configuration:**
```toml
[[extensions.targeting]]
module = "./src/ProfileBlock.jsx"
target = "customer-account.profile.block.render"

[extensions.capabilities]
api_access = true  # Enables Storefront API queries
```

**Update Functionality:**
- Backend API endpoint: `PATCH /api/wholesale-account/:metaobjectId`
- Updates metaobject fields via Shopify Admin GraphQL API
- Shows loading state ("Updating...") while processing
- Displays success banner on successful update
- Shows error banner if update fails
- Success message auto-dismisses after 5 seconds

**API Endpoint Details:**
```
PATCH /api/wholesale-account/:metaobjectId
Body: {
  company?: string,
  email?: string,
  phone?: string,
  website?: string,
  instagram?: string,
  address?: string,
  address2?: string,
  city?: string,
  state?: string,
  zip?: string,
  vat_tax_id?: string,
  tax_exempt?: boolean,
  source?: string,
  message?: string
}
```

**Required Secrets:**
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Shopify Admin API access token with `write_metaobjects` permission
- `SHOPIFY_SHOP_DOMAIN` - Your Shopify store domain

## Wholesale Onboarding Flow

### Complete 5-Phase Architecture

**Phase 1: Application Submission**
- User submits registration form with business credentials
- AI-powered company enrichment auto-fills details
- Tax exemption documentation uploaded
- Database record created with `pending` status

**Phase 2: Admin Approval**
- Admin reviews credentials in dashboard
- Approves/rejects application with notes
- Triggers automated account creation

**Phase 3: Shopify Integration (Source of Truth)**
- Creates `wholesale_account` metaobject with all business details
- Creates Shopify customer with metaobject reference (bidirectional)
- Links customer ↔ metaobject via metafields

**Phase 4: CRM Synchronization**
- Creates Clarity CRM Account
- Creates CRM Contact linked to Account
- Uploads tax documentation as attachment
- Saves `clarity_id` back to Shopify metaobject

**Phase 5: Webhook-Driven Sync**
- `metaobjects/update` webhook → syncs to CRM Account
- `customers/update` webhook → syncs to CRM Contact
- CRM confirmation webhooks logged for audit trail

### Data Flow Diagram

```
Registration Form
    ↓
Database (pending)
    ↓
Admin Approval
    ↓
Shopify Metaobject → Customer (with metafield)
    ↓
CRM Account → Contact → Attachment
    ↓
Webhook Synchronization (ongoing)
```

### Key Endpoints

```
POST   /api/wholesale-registration
GET    /api/wholesale-registrations
PATCH  /api/wholesale-registration/:id
POST   /api/wholesale-registration/:id/create-shopify-account
PATCH  /api/wholesale-account/:metaobjectId
POST   /api/webhooks/metaobjects/update
POST   /api/webhooks/customers/update
POST   /api/webhooks/clarity/account_create
POST   /api/webhooks/clarity/contact_create
```

## Documentation References

- **[README.md](README.md)** - Complete project overview and API reference
- **[docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md)** - Visual identity specifications
- **[docs/SHOPIFY_INTEGRATION.md](docs/SHOPIFY_INTEGRATION.md)** - Integration guide with customer account extension
- **[docs/ONBOARD_FLOW.md](docs/ONBOARD_FLOW.md)** - Detailed wholesale onboarding flow
- **[docs/SHOPIFY_APP_BLOCKS.md](docs/SHOPIFY_APP_BLOCKS.md)** - Theme app blocks deployment
- **[AGENT.md](AGENT.md)** - AI agent system knowledge
