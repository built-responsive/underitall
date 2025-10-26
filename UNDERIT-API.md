
# UnderItAll API Documentation

> **Complete API Reference for UnderItAll Wholesale Management System**  
> Version: 1.0 | Last Updated: January 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Wholesale Registration API](#wholesale-registration-api)
4. [Calculator & Quotes API](#calculator--quotes-api)
5. [Draft Orders API](#draft-orders-api)
6. [CRM Integration API](#crm-integration-api)
7. [Shopify GraphQL Proxy](#shopify-graphql-proxy)
8. [Email & Notifications API](#email--notifications-api)
9. [Webhook Endpoints](#webhook-endpoints)
10. [Admin Utilities](#admin-utilities)
11. [Error Handling](#error-handling)

---

## Overview

**Base URL**: `https://join.itsunderitall.com/api`  
**Protocol**: HTTPS  
**Response Format**: JSON  
**Date Format**: ISO 8601  

### System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Shopify Store  │ ←────→  │  UnderItAll API  │ ←────→  │ Clarity CRM │
│  (Metaobjects)  │         │  (Express/Node)  │         │  (Accounts) │
└─────────────────┘         └──────────────────┘         └─────────────┘
         │                           │                           │
         │                           │                           │
         ▼                           ▼                           ▼
  Customer Portal            PostgreSQL DB              Gmail API
   (Extensions)              (Drizzle ORM)           (Notifications)
```

---

## Authentication

### Environment Variables Required

```bash
# Shopify
SHOPIFY_SHOP_DOMAIN=its-under-it-all.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_WEBHOOK_SECRET=xxxxx

# CRM
CRM_BASE_URL=http://liveapi.claritysoftcrm.com
CRM_API_KEY=underitall-key-xxxxx

# OpenAI (for enrichment)
OPENAI_API_KEY=sk-xxxxx

# Gmail (via Replit Connectors)
REPLIT_CONNECTORS_HOSTNAME=xxxxx
REPL_IDENTITY=xxxxx
```

### CORS Configuration

**Allowed Origins**:
- `https://its-under-it-all.myshopify.com`
- `https://admin.shopify.com`
- `https://join.itsunderitall.com`
- All `*.replit.dev` domains (development)

**Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS

---

## Wholesale Registration API

### POST /api/wholesale-registration

Submit a new wholesale account application.

**Request Body**:
```json
{
  "firmName": "Magnolia Design Studio",
  "firstName": "Jane",
  "lastName": "Smith",
  "title": "Lead Designer",
  "email": "jane@magnoliadesign.com",
  "phone": "(555) 123-4567",
  "website": "https://magnoliadesign.com",
  "businessAddress": "123 Main St",
  "businessAddress2": "Suite 200",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "instagramHandle": "@magnoliadesign",
  "certificationUrl": "https://example.com/cert.pdf",
  "businessType": "interior_designer",
  "yearsInBusiness": 5,
  "isTaxExempt": true,
  "taxId": "12-3456789",
  "taxIdProofUrl": "https://example.com/tax-proof.pdf",
  "howDidYouHear": "Instagram",
  "receivedSampleSet": false,
  "marketingOptIn": true,
  "termsAccepted": true,
  "smsConsent": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "registrationId": "eb52def2-546e-466c-bc62-45e3a592a393",
  "message": "Registration submitted. Awaiting admin approval."
}
```

**Flow**:
1. Validates all required fields
2. Maps `marketingOptIn` → `acceptsEmailMarketing`
3. Maps `smsConsent` → `acceptsSmsMarketing`
4. Saves to `wholesale_registrations` table with `status: "pending"`
5. Sends Gmail notification to admins
6. **CRM sync deferred until admin approval**

---

### GET /api/wholesale-registrations

Fetch all wholesale registrations (admin only).

**Query Parameters**: None

**Response** (200 OK):
```json
[
  {
    "id": "eb52def2-546e-466c-bc62-45e3a592a393",
    "firmName": "Magnolia Design Studio",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@magnoliadesign.com",
    "phone": "(555) 123-4567",
    "status": "pending",
    "clarityAccountId": null,
    "shopifyCustomerId": null,
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:30:00.000Z"
  }
]
```

**Headers**:
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

---

### PATCH /api/wholesale-registration/:id

Update registration fields (admin only).

**URL Parameters**:
- `id` (UUID): Registration ID

**Request Body** (partial updates allowed):
```json
{
  "status": "approved",
  "adminNotes": "Verified via phone call",
  "approvedBy": "admin-user-id",
  "approvedAt": "2025-01-21T11:00:00.000Z"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "registration": { /* updated record */ }
}
```

---

### POST /api/admin/check-crm-duplicates/:id

Check for potential duplicate CRM accounts before approval.

**URL Parameters**:
- `id` (UUID): Registration ID

**Request Body**: None

**CRM Payload Sent**:
```json
{
  "APIKey": "underitall-key-xxxxx",
  "Resource": "Account",
  "Operation": "Get",
  "Columns": ["Account", "AccountID", "AccountNumber", "City", "State", "CompanyPhone", "Website"],
  "SQLFilter": "Account = 'Magnolia Design Studio' OR CompanyPhone = '(555) 123-4567' OR Website = 'https://magnoliadesign.com'",
  "Sort": {
    "Column": "CreationDate",
    "Order": "Desc"
  }
}
```

**Response** (200 OK):
```json
{
  "conflicts": [
    {
      "Account": "Magnolia Design Studio",
      "AccountID": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
      "AccountNumber": "AC000931",
      "City": "Austin",
      "State": "TX",
      "CompanyPhone": "(555) 123-4567",
      "Website": "https://magnoliadesign.com"
    }
  ],
  "registration": {
    "firmName": "Magnolia Design Studio",
    "phone": "(555) 123-4567",
    "website": "https://magnoliadesign.com"
  }
}
```

**Flow**:
1. Fetches registration from DB
2. Builds SQL filter for company name, phone, website
3. Queries CRM Account resource
4. Returns array of potential conflicts (empty if none found)

---

### POST /api/admin/sync-to-crm/:id

Create or update CRM account (idempotent).

**URL Parameters**:
- `id` (UUID): Registration ID

**Request Body** (optional):
```json
{
  "accountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5"
}
```

**CRM Payload Sent**:
```json
{
  "APIKey": "underitall-key-xxxxx",
  "Resource": "Account",
  "Operation": "Create Or Edit",
  "AccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
  "Data": {
    "Name": "Magnolia Design Studio",
    "First Name": "Jane",
    "Last Name": "Smith",
    "CompanyPhone": "(555) 123-4567",
    "Email": "jane@magnoliadesign.com",
    "Address1": "123 Main St",
    "Address2": "Suite 200",
    "City": "Austin",
    "State": "TX",
    "ZipCode": "78701",
    "Country": "United States",
    "Note": "Created via Wholesale Registration",
    "Account Type": "interior_designer",
    "Sample Set": "No",
    "Instagram": "@magnoliadesign",
    "Website": "https://magnoliadesign.com",
    "Accepts Email Marketing": "Yes",
    "Accepts SMS Marketing": "Yes",
    "EIN": "12-3456789",
    "UIA-ID": "eb52def2-546e-466c-bc62-45e3a592a393",
    "Representative": "John Thompson",
    "leadsourceid": "85927b21-38b2-49dd-8b15-c9b43e41925b",
    "leadsources": "Partner",
    "Sales Representative": "John Thompson",
    "Registration": "Registered but no documentation",
    "Lead Source Specifics": "UIA WHOLESALE APP",
    "Tags": "UIA-FORM",
    "Shopify Reference": "its-under-it-all"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "clarityAccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
  "isUpdate": true
}
```

**Flow**:
1. Fetches registration from DB
2. If `accountId` provided, updates existing CRM account
3. Otherwise, creates new CRM account
4. Saves `clarityAccountId` to `wholesale_registrations` table
5. Relays payload to flow-webhooks (non-blocking)

---

### POST /api/wholesale-registration/:id/create-shopify-account

Create Shopify customer with wholesale metafields.

**URL Parameters**:
- `id` (UUID): Registration ID

**Request Body**: None

**Shopify Mutations Executed**:

1. **Search for Existing Customer (by email)**:
```graphql
query SearchCustomers($query: String!) {
  customers(first: 1, query: $query) {
    edges {
      node { id }
    }
  }
}
```

2. **Search by Phone (fallback)**:
```graphql
query SearchCustomersByPhone($query: String!) {
  customers(first: 1, query: $query) {
    edges {
      node { id email phone }
    }
  }
}
```

3. **Create Customer (if not exists)**:
```json
POST /admin/api/2025-01/customers.json
{
  "customer": {
    "email": "jane@magnoliadesign.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "(555) 123-4567",
    "tags": "wholesale, interior_designer",
    "note": "Wholesale account - Magnolia Design Studio",
    "tax_exempt": true,
    "addresses": [{
      "address1": "123 Main St",
      "address2": "Suite 200",
      "city": "Austin",
      "province": "TX",
      "zip": "78701",
      "country": "United States",
      "company": "Magnolia Design Studio"
    }]
  }
}
```

4. **Set Metafields**:
```graphql
mutation SetCustomerMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { key namespace value }
    userErrors { field message }
  }
}
```

Metafields set:
- `custom.wholesale_name` → `"Magnolia Design Studio"`
- `custom.uia_id` → `"eb52def2-546e-466c-bc62-45e3a592a393"`
- `custom.wholesale_clarity_id` → `"f47d9cb1-2d8f-4fb9-9228-f098d2d80af5"`
- `custom.clarity_account_name` → `"Magnolia Design Studio"`

**Response** (200 OK):
```json
{
  "success": true,
  "customerId": 8523485118624,
  "customerUrl": "https://its-under-it-all.myshopify.com/admin/customers/8523485118624",
  "clarityAccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
  "customerExists": false,
  "message": "Created new customer with wholesale metafields"
}
```

---

### POST /api/admin/approve-registration/:id

**Complete approval workflow** (orchestrates all steps).

**URL Parameters**:
- `id` (UUID): Registration ID

**Request Body**: None

**Flow**:
1. Validates `clarityAccountId` exists (must sync to CRM first)
2. Updates CRM Account (via same payload as sync-to-crm)
3. Creates/updates Shopify Customer + sets `wholesale_clarity_id` metafield
4. Updates registration status to `"approved"`
5. Sends welcome email to customer (with profile link)
6. Sends admin notification email
7. Logs sync timestamp and direction

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Registration approved, CRM account created, customer linked, welcome email sent",
  "clarityAccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5"
}
```

---

### POST /api/enrich-company

AI-powered company enrichment using gpt-4o-search-preview.

**Request Body**:
```json
{
  "firmName": "Magnolia Design Studio"
}
```

**Cloudflare Geo Headers Used**:
- `cf-ipcountry`: Country code (e.g., "US")
- `cf-ipcity`: City name
- `cf-region`: State/region code
- `cf-connecting-ip`: Client IP

**OpenAI Payload Sent**:
```json
{
  "model": "gpt-4o-search-preview",
  "response_format": { "type": "text" },
  "web_search_options": {
    "search_context_size": "low",
    "user_location": {
      "type": "approximate",
      "approximate": { "country": "US" }
    }
  },
  "messages": [
    {
      "role": "developer",
      "content": "Return ONE US business profile as JSON with strict schema..."
    },
    {
      "role": "user",
      "content": "Company to research: \"Magnolia Design Studio\""
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "enriched": true,
  "data": {
    "website": "https://magnoliadesign.com",
    "instagramHandle": "@magnoliadesign",
    "businessAddress": "123 Main St",
    "businessAddress2": "Suite 200",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "phone": "(555) 123-4567"
  }
}
```

**Response** (no data found):
```json
{
  "enriched": false,
  "data": null
}
```

---

## Calculator & Quotes API

### POST /api/calculator/calculate

Calculate pricing without saving quote.

**Request Body**:
```json
{
  "width": 96,
  "length": 120,
  "thickness": "thin",
  "quantity": 1
}
```

**Response** (200 OK):
```json
{
  "width": 96,
  "length": 120,
  "thickness": "thin",
  "shape": "rectangle",
  "area": 80.0,
  "pricePerSqFt": 12.50,
  "totalPrice": 1000.00,
  "quantity": 1
}
```

**Pricing Logic**:
- Loads `priceBreakMap_Thin.json` or `priceBreakMap_Thick.json`
- Calculates area: `(width * length) / 144`
- Looks up price tier based on area
- Multiplies by quantity

---

### POST /api/calculator/quote

Save calculated quote to database.

**Request Body**:
```json
{
  "width": 96,
  "length": 120,
  "thickness": "thin",
  "shape": "rectangle",
  "area": 80.0,
  "quantity": 1,
  "totalPrice": 1000.00,
  "pricePerSqFt": 12.50,
  "projectName": "Downtown Loft",
  "installLocation": "Living Room",
  "poNumber": "PO-2025-001",
  "clientName": "John Doe",
  "notes": "Rush delivery needed"
}
```

**Response** (201 Created):
```json
{
  "id": "f5c35332-5c62-4313-a45c-a4c8...",
  "width": "96.00",
  "length": "120.00",
  "thickness": "thin",
  "shape": "rectangle",
  "area": "80.00",
  "quantity": 1,
  "totalPrice": "1000.00",
  "pricePerSqFt": "12.50",
  "projectName": "Downtown Loft",
  "installLocation": "Living Room",
  "createdAt": "2025-01-21T12:00:00.000Z"
}
```

---

### GET /api/calculator/quotes

Fetch all saved quotes.

**Query Parameters**: None

**Response** (200 OK):
```json
[
  {
    "id": "f5c35332-5c62-4313-a45c-a4c8...",
    "width": "96.00",
    "length": "120.00",
    "thickness": "thin",
    "totalPrice": "1000.00",
    "createdAt": "2025-01-21T12:00:00.000Z"
  }
]
```

---

## Draft Orders API

### POST /api/draft-order

Create Shopify draft order from quote.

**Request Body**:
```json
{
  "calculatorQuoteId": "f5c35332-5c62-4313-a45c-a4c8...",
  "customerEmail": "jane@magnoliadesign.com",
  "note": "Created via Calculator",
  "lineItems": [
    {
      "title": "Custom Rug Pad - 96\" × 120\"",
      "quantity": 1,
      "price": "1000.00",
      "customAttributes": [
        { "key": "Width", "value": "96\"" },
        { "key": "Length", "value": "120\"" },
        { "key": "Thickness", "value": "⅛\" (Thin)" }
      ]
    }
  ]
}
```

**Shopify Mutation Executed**:
```graphql
mutation draftOrderCreate($input: DraftOrderInput!) {
  draftOrderCreate(input: $input) {
    draftOrder {
      id
      invoiceUrl
      totalPrice
    }
    userErrors {
      field
      message
    }
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "draftOrder": {
    "id": "d5fbc433-5907-4518-8396-f01ae070a...",
    "shopifyDraftOrderId": "gid://shopify/DraftOrder/1234567890",
    "shopifyDraftOrderUrl": "https://its-under-it-all.myshopify.com/admin/draft_orders/1234567890",
    "invoiceUrl": "https://checkout.shopify.com/...",
    "totalPrice": "1000.00",
    "createdAt": "2025-01-21T12:30:00.000Z"
  },
  "invoiceUrl": "https://checkout.shopify.com/..."
}
```

**Flow**:
1. Validates `lineItems` array
2. Creates Shopify draft order via GraphQL
3. Saves to `draft_orders` table
4. Sends Gmail notification to admins

---

### GET /api/draft-orders

Fetch all draft orders.

**Response** (200 OK):
```json
[
  {
    "id": "d5fbc433-5907-4518-8396-f01ae070a...",
    "shopifyDraftOrderId": "gid://shopify/DraftOrder/1234567890",
    "shopifyDraftOrderUrl": "https://its-under-it-all.myshopify.com/admin/draft_orders/1234567890",
    "invoiceUrl": "https://checkout.shopify.com/...",
    "totalPrice": "1000.00",
    "createdAt": "2025-01-21T12:30:00.000Z"
  }
]
```

---

## CRM Integration API

### POST /api/crm/account

Query CRM account by AccountId.

**Request Body**:
```json
{
  "accountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5"
}
```

**CRM Payload Sent**:
```json
{
  "APIKey": "underitall-key-xxxxx",
  "Resource": "Account",
  "Operation": "Get",
  "AccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5"
}
```

**Response** (200 OK):
```json
{
  "Status": "Success",
  "ErrorCode": 0,
  "Message": "",
  "Data": {
    "Account": "Magnolia Design Studio",
    "AccountID": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
    "AccountNumber": "AC000931",
    "CompanyPhone": "(555) 123-4567",
    "CompanyEmail": "jane@magnoliadesign.com",
    "Website": "https://magnoliadesign.com",
    "Address1": "123 Main St",
    "City": "Austin",
    "State": "TX",
    "ZipCode": "78701"
  }
}
```

---

### GET /api/customer/wholesale-account

Fetch wholesale account data for customer (via Shopify metafield).

**Query Parameters**:
- `customerId` (GID): Shopify Customer ID (e.g., `gid://shopify/Customer/8523485118624`)

**Flow**:
1. Fetches customer's `wholesale_clarity_id` metafield from Shopify
2. If found, queries CRM Account by `AccountNumber`
3. Returns full CRM account data

**Response** (200 OK):
```json
{
  "hasWholesaleAccount": true,
  "clarityAccountId": "AC000931",
  "account": {
    "company": "Magnolia Design Studio",
    "accountNumber": "AC000931",
    "email": "jane@magnoliadesign.com",
    "phone": "(555) 123-4567",
    "website": "https://magnoliadesign.com",
    "instagram": "@magnoliadesign",
    "address": "123 Main St",
    "address2": "Suite 200",
    "city": "Austin",
    "state": "TX",
    "zip": "78701",
    "taxExempt": true,
    "taxId": "12-3456789",
    "accountType": "interior_designer",
    "sampleSet": false,
    "source": "Instagram",
    "owner": "John Thompson",
    "createdDate": "2025-01-21T10:00:00.000Z",
    "_raw": { /* full CRM response */ }
  }
}
```

**Response** (no account):
```json
{
  "hasWholesaleAccount": false,
  "message": "No wholesale account found"
}
```

---

### PATCH /api/customer/wholesale-account

Update wholesale account (sync to CRM).

**Request Body**:
```json
{
  "customerId": "gid://shopify/Customer/8523485118624",
  "clarityAccountId": "AC000931",
  "updates": {
    "company": "Magnolia Design Studio LLC",
    "phone": "(555) 999-8888",
    "website": "https://newwebsite.com",
    "address": "456 Oak Ave",
    "address2": "",
    "city": "Dallas",
    "state": "TX",
    "zip": "75201",
    "instagram": "@newhandle"
  }
}
```

**CRM Payload Sent**:
```json
{
  "APIKey": "underitall-key-xxxxx",
  "Resource": "Account",
  "Operation": "Create Or Edit",
  "Data": {
    "AccountNumber": "AC000931",
    "AccountName": "Magnolia Design Studio LLC",
    "CompanyPhone": "(555) 999-8888",
    "Website": "https://newwebsite.com",
    "Address1": "456 Oak Ave",
    "Address2": "",
    "City": "Dallas",
    "State": "TX",
    "ZipCode": "75201",
    "Instagram": "@newhandle"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Wholesale account updated in CRM"
}
```

---

## Shopify GraphQL Proxy

### POST /api/shopify/graphql

Execute GraphQL queries against Shopify Admin API.

**Request Body**:
```json
{
  "query": "query { shop { name email } }",
  "variables": {}
}
```

**Response** (200 OK):
```json
{
  "data": {
    "shop": {
      "name": "Its Under It All",
      "email": "sales@itsunderitall.com"
    }
  }
}
```

**Common Queries**:

**Fetch Customer Metafield**:
```graphql
query GetCustomerMetafield($customerId: ID!) {
  customer(id: $customerId) {
    id
    email
    metafield(namespace: "custom", key: "wholesale_clarity_id") {
      value
    }
  }
}
```

**Set Customer Metafields**:
```graphql
mutation SetCustomerMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      key
      namespace
      value
    }
    userErrors {
      field
      message
    }
  }
}
```

---

## Email & Notifications API

### GET /api/email-templates

Fetch all email templates.

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "new-crm-customer",
    "subject": "Welcome to UnderItAll Wholesale! Your Account is Ready",
    "category": "welcome",
    "active": true,
    "variables": [
      "firstName", "lastName", "firmName", "clarityAccountId", "profileUrl"
    ],
    "createdAt": "2025-01-21T08:00:00.000Z"
  }
]
```

---

### GET /api/email-templates/:id

Fetch single template.

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "new-crm-customer",
  "subject": "Welcome to UnderItAll Wholesale! Your Account is Ready",
  "htmlContent": "<html>...</html>",
  "textContent": "Welcome {{firstName}}...",
  "category": "welcome",
  "active": true,
  "variables": ["firstName", "lastName", "firmName"]
}
```

---

### PUT /api/email-templates/:id

Update template.

**Request Body**:
```json
{
  "subject": "Updated Subject Line",
  "htmlContent": "<html>...</html>",
  "active": true
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "new-crm-customer",
  "subject": "Updated Subject Line",
  "updatedAt": "2025-01-21T14:00:00.000Z"
}
```

---

### POST /api/gmail/send-test

Send test email (with template rendering + HTML support).

**Request Body**:
```json
{
  "to": "test@example.com",
  "templateId": "550e8400-e29b-41d4-a716-446655440000",
  "subject": "Test Email",
  "variables": {
    "firstName": "Jane",
    "lastName": "Smith",
    "firmName": "Magnolia Design Studio"
  }
}
```

**Alternative** (raw HTML):
```json
{
  "to": "test@example.com",
  "subject": "Test Email",
  "htmlContent": "<html><body><h1>Test</h1></body></html>"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "messageId": "18d12345abcdef",
  "message": "Test email sent successfully with HTML formatting"
}
```

---

### GET /api/email-send-log

Fetch email send history.

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "templateId": "new-crm-customer",
    "recipient": "jane@magnoliadesign.com",
    "subject": "Welcome to UnderItAll Wholesale!",
    "status": "sent",
    "sentAt": "2025-01-21T12:00:00.000Z",
    "createdAt": "2025-01-21T12:00:00.000Z"
  }
]
```

---

### GET /api/notification-recipients

Fetch notification recipients.

**Query Parameters**:
- `category` (optional): Filter by category (e.g., `wholesale_notifications`)

**Response** (200 OK):
```json
{
  "recipients": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "sales@itsunderitall.com",
      "category": "wholesale_notifications",
      "active": true,
      "createdAt": "2025-01-21T08:00:00.000Z"
    }
  ]
}
```

---

### POST /api/notification-recipients

Add notification recipient.

**Request Body**:
```json
{
  "email": "admin@itsunderitall.com",
  "category": "wholesale_notifications"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "recipient": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@itsunderitall.com",
    "category": "wholesale_notifications",
    "active": true
  }
}
```

---

### DELETE /api/notification-recipients/:id

Remove recipient.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Recipient removed"
}
```

---

## Webhook Endpoints

All webhook endpoints require HMAC verification (except in development mode).

### Webhook Verification

**Headers**:
- `X-Shopify-Hmac-Sha256`: Base64-encoded HMAC SHA256 signature
- `X-Shopify-Shop-Domain`: Shop domain (e.g., `its-under-it-all.myshopify.com`)
- `X-Shopify-Topic`: Webhook topic (e.g., `customers/create`)

**Verification Logic**:
```javascript
const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
const rawBody = req.rawBody; // Captured before JSON parsing
const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

const hash = crypto
  .createHmac("sha256", webhookSecret)
  .update(rawBody, "utf8")
  .digest("base64");

const isValid = crypto.timingSafeEqual(
  Buffer.from(hmacHeader),
  Buffer.from(hash)
);
```

---

### POST /api/webhooks/customers/create

Triggered when Shopify customer is created.

**Shopify Payload**:
```json
{
  "id": 8523485118624,
  "email": "jane@magnoliadesign.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+15551234567",
  "admin_graphql_api_id": "gid://shopify/Customer/8523485118624",
  "created_at": "2025-01-21T12:00:00-05:00"
}
```

**Flow**:
1. Verifies HMAC signature
2. Logs to `webhook_logs` table
3. Searches `wholesale_registrations` for matching email
4. If found, updates `shopifyCustomerId` field
5. Returns 200 OK

---

### POST /api/webhooks/customers/update

Triggered when Shopify customer is updated.

**Shopify Payload**:
```json
{
  "id": 8523485118624,
  "email": "jane@magnoliadesign.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+15559998888",
  "default_address": {
    "address1": "456 Oak Ave",
    "city": "Dallas",
    "province_code": "TX",
    "zip": "75201"
  },
  "admin_graphql_api_id": "gid://shopify/Customer/8523485118624"
}
```

**Flow**:
1. Verifies HMAC signature
2. Logs to `webhook_logs` table
3. Fetches customer's `wholesale_clarity_id` metafield
4. If found, updates CRM Contact via API
5. Returns 200 OK

**CRM Payload Sent**:
```json
{
  "APIKey": "underitall-key-xxxxx",
  "Resource": "Contact",
  "Operation": "Create Or Edit",
  "Data": {
    "AccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
    "FirstName": "Jane",
    "LastName": "Smith",
    "Email": "jane@magnoliadesign.com",
    "Phone": "+15559998888",
    "Address1": "456 Oak Ave",
    "City": "Dallas",
    "State": "TX",
    "ZipCode": "75201"
  }
}
```

---

### POST /api/webhooks/shopify

Generic handler for any Shopify webhook.

**Headers**:
- `X-Shopify-Topic`: Webhook topic

**Flow**:
1. Verifies HMAC signature
2. Logs to `webhook_logs` table with topic
3. Returns 200 OK

**Supported Topics**:
- `customers/create`
- `customers/update`
- `metaobjects/create`
- `metaobjects/update`
- Any other Shopify webhook

---

### POST /api/webhooks/clarity/account_create

CRM webhook for account creation (future use).

**Expected Payload**:
```json
{
  "AccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
  "AccountNumber": "AC000931",
  "AccountName": "Magnolia Design Studio",
  "CreatedAt": "2025-01-21T12:00:00Z"
}
```

**Flow**:
1. Logs to `webhook_logs` table (source: "crm")
2. Returns 200 OK

---

### POST /api/webhooks/clarity/contact_create

CRM webhook for contact creation (future use).

**Expected Payload**:
```json
{
  "ContactId": "550e8400-e29b-41d4-a716-446655440000",
  "AccountId": "f47d9cb1-2d8f-4fb9-9228-f098d2d80af5",
  "FirstName": "Jane",
  "LastName": "Smith",
  "Email": "jane@magnoliadesign.com"
}
```

**Flow**:
1. Logs to `webhook_logs` table (source: "crm")
2. Returns 200 OK

---

### GET /api/webhooks/logs

Fetch webhook logs (admin only).

**Query Parameters**:
- `limit` (optional, default: 100): Max logs to return

**Response** (200 OK):
```json
{
  "total": 245,
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-01-21T12:30:00.000Z",
      "type": "customers/update",
      "source": "shopify",
      "shopDomain": "its-under-it-all.myshopify.com",
      "topic": "customers/update",
      "payload": { /* full webhook payload */ }
    }
  ]
}
```

**Headers**:
```
Cache-Control: no-cache, no-store, must-revalidate
```

---

## Admin Utilities

### GET /api/health

Health check with integration status.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-01-21T12:00:00.000Z",
  "shopify": {
    "configured": true,
    "shop": "its-under-it-all.myshopify.com",
    "metaobjectDefinition": true,
    "metaobjectId": "gid://shopify/MetaobjectDefinition/...",
    "metaobjectName": "Wholesale Account",
    "metaobjectType": "$app:wholesale_account",
    "fieldCount": 45,
    "entryCount": 8
  },
  "crm": {
    "configured": true,
    "baseUrl": "http://liveapi.claritysoftcrm.com"
  }
}
```

---

### POST /api/admin/test-shopify

Test Shopify connection.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Connected to Its Under It All",
  "shop": {
    "name": "Its Under It All",
    "email": "sales@itsunderitall.com",
    "myshopifyDomain": "its-under-it-all.myshopify.com"
  }
}
```

---

### POST /api/admin/test-crm

Test CRM connection.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Connected to Clarity CRM",
  "data": { /* API ping response */ }
}
```

---

### GET /debug

Visual admin dashboard (HTML).

**Response**: Full HTML page with:
- Metaobject status
- Recent registrations
- Recent quotes
- Recent webhooks
- Environment config

---

### GET /api/debug-metaobject

Debug metaobject queries.

**Response** (200 OK):
```json
{
  "success": true,
  "definition": {
    "id": "gid://shopify/MetaobjectDefinition/...",
    "name": "Wholesale Account",
    "type": "$app:wholesale_account",
    "fieldDefinitions": [
      { "key": "company", "name": "Company", "type": { "name": "single_line_text_field" } }
    ]
  },
  "metaobjects": [
    {
      "id": "gid://shopify/Metaobject/151178215659",
      "handle": "magnolia-design-studio",
      "displayName": "Magnolia Design Studio",
      "fields": [
        { "key": "company", "value": "Magnolia Design Studio" }
      ]
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Descriptive error message",
  "details": { /* optional additional context */ }
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | `GET /api/wholesale-registrations` |
| 201 | Created | `POST /api/wholesale-registration` |
| 400 | Bad Request | Missing required fields |
| 401 | Unauthorized | Invalid webhook HMAC |
| 404 | Not Found | Registration ID doesn't exist |
| 500 | Server Error | Database connection failure |

### Common Error Scenarios

**Missing Environment Variables**:
```json
{
  "error": "Shopify credentials not configured"
}
```

**Validation Failure**:
```json
{
  "error": "Validation errors",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

**CRM API Error**:
```json
{
  "error": "CRM lookup failed",
  "details": "Connection timeout"
}
```

**Shopify GraphQL Error**:
```json
{
  "error": "GraphQL query failed",
  "details": {
    "userErrors": [
      { "field": "metafield", "message": "Invalid namespace" }
    ]
  }
}
```

---

## Flow Diagrams

### Wholesale Registration Flow

```
User Submits Form
       ↓
POST /api/wholesale-registration
       ↓
Save to DB (status: pending)
       ↓
Send Gmail notification to admins
       ↓
Admin Reviews in Dashboard
       ↓
POST /api/admin/check-crm-duplicates/:id
       ↓
POST /api/admin/sync-to-crm/:id
       ↓
POST /api/admin/approve-registration/:id
       ├─→ Update CRM Account
       ├─→ Create Shopify Customer
       ├─→ Set wholesale_clarity_id metafield
       ├─→ Send welcome email to customer
       └─→ Update DB (status: approved)
```

### Webhook Sync Flow

```
Shopify Customer Updated
       ↓
POST /api/webhooks/customers/update
       ↓
Verify HMAC signature
       ↓
Log to webhook_logs
       ↓
Fetch wholesale_clarity_id metafield
       ↓
Query CRM Account by AccountNumber
       ↓
Update CRM Contact
       ↓
Return 200 OK
```

---

## Appendix: Database Schema

### wholesale_registrations

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `firmName` | TEXT | Company name |
| `firstName` | TEXT | Contact first name |
| `lastName` | TEXT | Contact last name |
| `email` | TEXT | Contact email (unique) |
| `phone` | TEXT | Contact phone |
| `businessAddress` | TEXT | Street address |
| `city` | TEXT | City |
| `state` | TEXT | State code (2 letters) |
| `zipCode` | TEXT | ZIP code |
| `isTaxExempt` | BOOLEAN | Tax exempt status |
| `taxId` | TEXT | EIN/VAT ID |
| `clarityAccountId` | TEXT | CRM Account ID |
| `shopifyCustomerId` | TEXT | Shopify Customer ID |
| `status` | TEXT | pending/approved/rejected |
| `lastSyncAt` | TIMESTAMP | Last sync timestamp |
| `lastSyncDirection` | TEXT | app_to_crm/crm_to_shopify |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

### webhook_logs

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `timestamp` | TIMESTAMP | Event timestamp |
| `type` | TEXT | Webhook topic |
| `source` | TEXT | shopify/crm |
| `shopDomain` | TEXT | Shopify shop domain |
| `topic` | TEXT | X-Shopify-Topic header |
| `payload` | JSONB | Full webhook payload |

### email_templates

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Template identifier |
| `subject` | TEXT | Email subject line |
| `htmlContent` | TEXT | HTML email body |
| `textContent` | TEXT | Plain text fallback |
| `variables` | JSONB | Template variables |
| `category` | TEXT | notification/welcome/order |
| `active` | BOOLEAN | Template enabled |

---

## Changelog

**v1.0.0** (January 2025)
- Initial API documentation
- All routes documented with schemas
- Webhook flows detailed
- CRM integration patterns established

---

**End of Documentation**
