
# Wholesale Onboarding Flow Documentation

This document outlines the complete onboarding flow for wholesale trade partners, from registration submission through approval, Shopify account creation, and ongoing synchronization with Clarity CRM.

---

## Overview

The wholesale onboarding system integrates three platforms:
1. **UnderItAll Application** - Registration form and admin approval workflow
2. **Shopify** - Metaobjects for wholesale accounts + Customer records
3. **Clarity CRM** - Account and Contact management with attachments

**Key Design Principle:** Shopify is the source of truth for wholesale account data. Changes flow: Shopify → CRM (via webhooks).

---

## Registration Flow

### Phase 1: Application Submission

1. **User fills out registration form** (`/wholesale-registration`)
   - Business information (company name, address, contact details)
   - Trade credentials (business type, years in business)
   - Tax exemption status (optional EIN/VAT ID + proof document)
   - Marketing preferences (how they heard about us, sample set received)

2. **AI-powered company enrichment** (automatic)
   - Triggers on company name blur event
   - Calls `/api/enrich-company` with `gpt-4o-search-preview` model
   - Auto-fills: website, Instagram, business address, city, state, ZIP, phone
   - Uses Cloudflare geo-headers for US location prioritization
   - Shows confirmation modal before applying enriched data

3. **Form validation & submission**
   - Client-side validation with Zod schema
   - EIN format validation: `XX-XXXXXXX` or `NA`
   - File upload for tax ID proof (PDF/JPG/PNG, 50MB max)
   - Submits to `POST /api/wholesale-registration`

4. **Database record created**
   - Status: `pending`
   - All form data stored in `wholesale_registrations` table
   - Tax ID proof URL saved (uploaded to storage)

5. **Admin notification** (future enhancement)
   - Email sent to admin team
   - Slack notification (optional)

---

## Phase 2: Admin Approval

### Admin Dashboard Review

1. **Admin logs into dashboard** (`/admin`)
   - Views all pending registrations
   - Reviews business credentials, tax documents
   - Verifies business legitimacy

2. **Admin approves application**
   - Updates status to `approved`
   - Sets `approvedAt` timestamp
   - Adds optional admin notes
   - Triggers Shopify + CRM account creation

---

## Phase 3: Shopify Account Creation

### Step 3.1: Create Wholesale Account Metaobject

**Endpoint:** `POST /api/wholesale-registration/:id/create-shopify-account`

**GraphQL Mutation:**
```graphql
mutation CreateWholesaleAccount($metaobject: MetaobjectCreateInput!) {
  metaobjectCreate(metaobject: $metaobject) {
    metaobject {
      id
      handle
      displayName
    }
    userErrors {
      field
      message
    }
  }
}
```

**Metaobject Type:** `wholesale_account`

**Fields Mapped:**
```javascript
{
  company: registration.firmName,
  email: registration.email,
  phone: registration.phone,
  website: registration.website || "",
  instagram: registration.instagramHandle || "",
  address: registration.businessAddress,
  address2: registration.businessAddress2 || "",
  city: registration.city,
  state: registration.state,
  zip: registration.zipCode,
  source: registration.howDidYouHear || "",
  message: registration.adminNotes || "",
  account_type: registration.businessType,
  sample_set: registration.receivedSampleSet ? "true" : "false",
  tax_exempt: registration.isTaxExempt ? "true" : "false",
  vat_tax_id: registration.taxId || "",
  // tax_proof: GenericFile GID (if uploaded)
  // clarity_id: (initially empty, populated by webhook)
}
```

**Response:**
- `metaobjectId`: `gid://shopify/Metaobject/137780953248`
- Handle: Auto-generated from company name (lowercase, hyphenated)

### Step 3.2: Create Shopify Customer (Optional)

**Note:** Customer creation uses REST Admin API (works on all Shopify plans, unlike GraphQL which requires Advanced plan+).

**REST Endpoint:**
```
POST https://{shop}.myshopify.com/admin/api/2024-10/customers.json
```

**Customer Payload:**
```json
{
  "customer": {
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "555-123-4567",
    "tax_exempt": true,
    "tags": "wholesale, trade-program, interior_designer",
    "note": "Business Type: Interior Designer\nYears in Business: 5\nMetaobject ID: gid://shopify/Metaobject/...",
    "addresses": [{
      "address1": "123 Main St",
      "city": "New York",
      "province": "NY",
      "zip": "10001",
      "country": "United States",
      "company": "Design Co"
    }],
    "metafields": [{
      "namespace": "custom",
      "key": "wholesale_account",
      "value": "gid://shopify/Metaobject/137780953248",
      "type": "metaobject_reference"
    }]
  }
}
```

**Customer-Metaobject Link:**
The `wholesale_account` metafield creates a bidirectional reference:
- Customer → Metaobject (via `metafield`)
- Metaobject → Customer (via `owner` field, which is a list reference)

**Error Handling:**
If customer creation fails (e.g., on Basic Shopify plan), the flow continues—metaobject is still created and functional.

---

## Phase 4: CRM Account Creation

### Step 4.1: Create Clarity CRM Account

**Endpoint:** `POST https://claritymobileapi.claritycrm.com/api/v1`

**Payload:**
```json
{
  "APIKey": "underitall-key-xxxxxxxx",
  "Resource": "Account",
  "Operation": "Create Or Edit",
  "Data": {
    "Name": "Design Co",
    "Owner": "John Doe",
    "CompanyPhone": "555-123-4567",
    "Email": "customer@example.com",
    "Address1": "123 Main St",
    "Address2": "",
    "City": "New York",
    "State": "NY",
    "ZipCode": "10001",
    "Country": "United States",
    "Note": "Shopify Customer ID: gid://shopify/Customer/...",
    "Description": "Admin notes from approval",
    "Sample Set": "Yes",
    "Registration": "Registered with documentation",
    "Account Type": "Interior Designer",
    "Instagram": "https://www.instagram.com/designco",
    "Website": "https://designco.com",
    "Accepts Email Marketing": "Yes",
    "Accepts SMS Marketing": "Yes"
  }
}
```

**Response:**
```json
{
  "Status": "Success",
  "Data": {
    "AccountId": "26fb47bc-32d0-434b-b6f7-39b8e06491b5"
  }
}
```

**Action:** Save `AccountId` to metaobject's `clarity_id` field.

### Step 4.2: Create Clarity CRM Contact

**Payload:**
```json
{
  "APIKey": "underitall-key-xxxxxxxx",
  "Resource": "Contact",
  "Operation": "Create Or Edit",
  "Data": {
    "AccountId": "26fb47bc-32d0-434b-b6f7-39b8e06491b5",
    "LeadSourceId": "62f4f09e-dbca-4ffb-a9a8-8fe8354c57b0",
    "LeadSources": "Website",
    "Lead Source Specifics": "Wholesale Registration",
    "Tags1": "wholesale,trade-program",
    "FirstName": "John",
    "LastName": "Doe",
    "Title": "Primary Contact",
    "Phone": "555-123-4567",
    "Email": "customer@example.com",
    "Address1": "123 Main St",
    "City": "New York",
    "State": "NY",
    "ZipCode": "10001",
    "Country": "United States",
    "About": "Business Type: Interior Designer",
    "Description": "Friend referral",
    "vSales Representatie": "B2B,wholesale",
    "Sample Set": "Yes",
    "Registration": "Registered with documentation",
    "Account Type": "Interior Designer",
    "Instagram": "https://www.instagram.com/designco",
    "Website": "https://designco.com"
  }
}
```

**Response:**
```json
{
  "Status": "Success",
  "Data": {
    "ContactId": "2fd08d74-f263-49b2-ad79-148df32a1662"
  }
}
```

### Step 4.3: Upload Tax ID Proof as Attachment

**Endpoint:** `POST https://claritymobileapi.claritycrm.com/api/v1/Attachment/Create`

**Payload:**
```json
{
  "APIKey": "underitall-key-xxxxxxxx",
  "Resource": "Attachment",
  "Operation": "Create",
  "Data": {
    "Title": "Tax ID / VAT Proof",
    "Name": "tax-id-proof.pdf",
    "SourceObjectId": "26fb47bc-32d0-434b-b6f7-39b8e06491b5",
    "FileContent": "base64EncodedFileContent..."
  }
}
```

---

## Phase 5: Webhook Synchronization

### Architecture

**Shopify Webhooks → Our Application → Clarity CRM**

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Shopify   │ ─────→  │  Our Webhooks    │ ─────→  │ Clarity CRM │
│             │         │  /api/webhooks   │         │             │
└─────────────┘         └──────────────────┘         └─────────────┘
     │                           │                           │
     │ metaobjects/update        │ Log to DB                 │
     │ customers/update          │ Parse payload             │
     │                           │ Trigger CRM sync          │
     │                           │                           │
     │                           ▼                           │
     │                   ┌──────────────────┐               │
     │                   │  webhook_logs    │               │
     │                   │  (PostgreSQL)    │               │
     │                   └──────────────────┘               │
     │                                                       │
     │◄──────────────────────────────────────────────────────┘
              Clarity webhooks (confirmation)
```

### Webhook Handlers

**Configured in `shopify.app.toml`:**
```toml
[[webhooks.subscriptions]]
topics = ["metaobjects/update"]
uri = "https://join.itsunderitall.com/api/webhooks/metaobjects/update"
filter = "type:wholesale_account"

[[webhooks.subscriptions]]
topics = ["customers/update"]
uri = "https://join.itsunderitall.com/api/webhooks/customers/update"
```

---

## Shopify Extensions

### Wholesale Account Profile Extension

**Complete Customer Self-Service Extension**

This Shopify Customer Account UI Extension allows wholesale customers to view and manage their wholesale account information directly from their Shopify customer profile page.

#### Extension Architecture

**Location:** `extensions/wholesale-account-profile/`  
**Target:** `customer-account.profile.block.render` (Customer profile page)  
**API Version:** 2025-10  
**Technologies:** React (`@shopify/ui-extensions-react/customer-account`)

#### Data Flow

**1. Extension Configuration** (`shopify.extension.toml`)
```toml
[extensions.capabilities]
api_access = true  # Enables Storefront API queries
```

**2. Fetch Customer's Metaobject**
```javascript
// Query customer's wholesale_account metafield
customer(id: $customerId) {
  metafield(namespace: "custom", key: "wholesale_account") {
    reference {
      ... on Metaobject {
        id
        handle
        fields { key value }
      }
    }
  }
}
```

**3. Update Flow**
```
User edits form → Submit button clicked → 
  Frontend: setSubmitting(true) →
  API Call: PATCH /api/wholesale-account/:metaobjectId →
  Backend: Shopify Admin GraphQL metaobjectUpdate mutation →
  Response: Success/Error →
  Frontend: Show banner, update local state
```

#### Backend Update API

**Endpoint:** `PATCH /api/wholesale-account/:metaobjectId`

**Request Body:**
```json
{
  "company": "Updated Company Name",
  "email": "new@email.com",
  "phone": "555-123-4567",
  "website": "https://newsite.com",
  "instagram": "newhandle",
  "address": "123 New St",
  "address2": "Suite 200",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "vat_tax_id": "12-3456789",
  "tax_exempt": true,
  "source": "Updated source",
  "message": "Updated notes"
}
```

#### Testing Checklist

- [ ] Extension renders on customer profile page
- [ ] Correctly fetches metaobject data via metafield reference
- [ ] Form fields populate with current values
- [ ] Update button shows loading state while submitting
- [ ] Success banner appears on successful update
- [ ] Error banner shows specific error messages
- [ ] Success banner auto-dismisses after 5 seconds
- [ ] Updated values reflected immediately in form
- [ ] Shopify Admin shows updated metaobject fields
- [ ] Webhook triggered on metaobject update (if configured)

---

## Security Considerations

### 1. Webhook Verification
- **Shopify:** Verify HMAC-SHA256 signature on all webhooks
- **CRM:** Verify `AppSignature` matches expected value
- **Reject:** All unsigned or invalid webhooks

### 2. API Key Management
- **Environment Variables:** Store all keys in `.env` (never committed)
- **Rotation:** Regularly rotate API keys
- **Access Control:** Limit API scopes to minimum required

### 3. Data Privacy
- **GDPR Compliance:** Allow users to request data deletion
- **Encryption:** All API calls use HTTPS
- **Logging:** Redact sensitive data in logs (emails, phone numbers)

### 4. Rate Limiting
- **Shopify API:** 2 requests/second (respect rate limits)
- **CRM API:** Unknown limits—implement exponential backoff
- **Webhooks:** No rate limit on incoming webhooks

---

## Conclusion

This onboarding flow ensures seamless integration between our application, Shopify, and Clarity CRM, with Shopify serving as the source of truth and webhooks keeping all systems synchronized in near real-time.
