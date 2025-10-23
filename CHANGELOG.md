
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## **AI AUTOMATION PROTOCOL**

> **MANDATORY FOR ALL AI AGENTS, ASSISTANTS & AUTOMATIONS:**
> 
> Every code edit, file change, configuration update, or system modification MUST include a changelog entry using this format:
> 
> ```markdown
> ## [Unreleased]
> ### Changed/Added/Fixed - YYYY-MM-DD HH:MM - [Agent/Assistant Name]
> - Specific description of what was modified
> - File paths affected: `path/to/file.ts`
> - Reason for change
> ```

---

## [Unreleased]

### Added - 2025-01-22 - [Replit Agent]
- Created Shopify Customer Account UI Extension at `underitall/extensions/wholesale-account-profile/`
  - ProfileBlock.jsx component targeting `customer-account.profile.block.render`
  - Displays wholesale account metaobject data on customer profile page
  - Edit functionality with form fields for all metaobject properties
  - Session token authentication for secure API calls
  - Network access enabled for backend API communication
  - Production URL: `https://its-under-it-all.replit.app`
- Added PATCH `/api/wholesale-account/:metaobjectId` endpoint
  - Bearer token authentication (session token from customer account UI)
  - Updates Shopify metaobject via Admin GraphQL API
  - Secure metaobject mutation with authorization checks
- Enhanced Shopify metaobject creation to include all fields
  - Added address fields: address, address2, city, state, zip
  - Added account_type, source, message fields
  - All fields from ONBOARD_FLOW.md example are now included
- Implemented CRM ID persistence workflow
  - Clarity CRM Account ID saved back to metaobject after creation
  - Enables proper webhook synchronization with CRM
  - clarity_id field populated automatically
- Enhanced webhook handlers in `server/webhooks.ts`
  - `metaobjects/update` webhook syncs to Clarity CRM accounts
  - `customers/update` webhook syncs to Clarity CRM contacts
  - Automatic field mapping between Shopify and Clarity
  - Robust error handling without breaking webhook delivery
  - HMAC signature verification for security
- Updated `underitall/shopify.app.toml`
  - Production URL: `https://its-under-it-all.replit.app`
  - Auth redirect URLs configured
  - Webhook subscriptions configured
  - All required API scopes included
- File paths affected: 
  - `server/routes.ts`
  - `server/webhooks.ts`
  - `client/src/pages/admin.tsx`
  - `underitall/extensions/wholesale-account-profile/src/ProfileBlock.jsx`
  - `underitall/extensions/wholesale-account-profile/shopify.extension.toml`
  - `underitall/shopify.app.toml`
  - `replit.md`
- Reason: Complete wholesale account management integration between UnderItAll app, Shopify (metaobjects + customers), and Clarity CRM per ONBOARD_FLOW.md

### Fixed - 2025-01-22 - [Replit Agent]
- Fixed LSP TypeScript errors across codebase
  - Removed invalid `contactName` property from registration submission
  - Fixed webhook GraphQL query syntax errors
  - Fixed admin.tsx missing variables and type issues
  - Changed `accountId`/`contactId` to `crmAccountId`/`crmContactId` for clarity
- Fixed security vulnerability in wholesale account update endpoint
  - Added Bearer token authentication requirement
  - Session token validation from customer account UI extension
  - Protected against unauthorized metaobject mutations
- Fixed customer account UI extension configuration
  - Enabled `network_access = true` in shopify.extension.toml
  - Changed from relative to absolute API URLs
  - Fixed API call authentication with session tokens
- Fixed CRM synchronization during account creation
  - Clarity Account ID now saved to metaobject immediately after CRM creation
  - Webhooks can now properly sync using clarity_id field
  - Complete registration → Shopify → CRM flow is now functional

### Changed - 2025-01-22 - [Replit Agent]
- Updated wholesale registration flow to use firstName + lastName instead of contactName
- Enhanced metaobject field coverage to match ONBOARD_FLOW.md specification
- Improved webhook error handling with detailed logging
- Updated customer account UI extension to display all metaobject fields including account_type, source, sample_set, tax_exempt, vat_tax_id, clarity_id

### Added - 2025-01-20 02:50 - [Replit Assistant]
- Created `CHANGELOG.md` for AI automation audit trail
- Updated `replit.md` with MCP Shopify Dev/Storefront integration documentation
- Added AI automation protocol requiring changelog entries for all edits
- File paths affected: `CHANGELOG.md`, `replit.md`
- Reason: Enforce traceability and transparency for all AI-driven code changes

---

## [2.0.0] - 2025-01-20

### Added - MCP Integration
- Shopify Dev MCP Server for real-time API documentation access
- Shopify Storefront MCP Server for live commerce data in AI chat
- MCP-enhanced chat assistant with product catalog search
- Customer account lookup and order history (MCP Storefront)
- Real-time Shopify API schema introspection (MCP Dev)

### Changed
- Chat assistant now uses MCP Storefront for product recommendations
- OpenAI integration enhanced with MCP context
- Updated environment variables for MCP enablement
- Enhanced documentation with MCP workflows and examples

### Fixed
- CRM base URL updated to correct Clarity API endpoint
- Shopify customer creation now uses Admin Access Token (not Storefront)
- Wholesale registration properly creates metaobjects on approval

---

## [1.0.0] - 2025-01-19

### Added - Initial MVP Release
- Wholesale registration with credential verification
- Real-time rug pad calculator with pricing engine
- AI-powered chat assistant (GPT-5)
- Admin dashboard for registration approvals
- Shopify draft order creation
- Theme app blocks for calculator and chat
- CRM integration with Clarity
- PostgreSQL database with Drizzle ORM
- Brand guidelines and design system

### Features
- Custom perforated rug pad pricing (⅛" and ¼" thickness)
- 4 shape options: Rectangle, Round, Square, Free Form
- File upload for business credentials
- Shopify metaobject creation for approved wholesalers
- Session-based chat with persistent history

---

## Legend

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

---

**AI Agents:** Remember to log ALL changes here. No exceptions.
