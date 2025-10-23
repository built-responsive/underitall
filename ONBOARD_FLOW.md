
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

**Action:** Save `AccountId` for contact creation.

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

### Webhook 1: `metaobjects/update`

**Shopify sends:** When wholesale_account metaobject is created or updated in admin.

**Endpoint:** `POST /api/webhooks/shopify` or `POST /api/webhooks/metaobjects/update`

**Sample Payload:**
```json
{
  "id": "gid://shopify/Metaobject/137780953248",
  "type": "wholesale_account",
  "fields": {
    "company": "Magnolify, Inc.",
    "email": "magnolify@gmail.com",
    "phone": "3862445990",
    "website": "https://magnolify.pro",
    "instagram": "magnolify",
    "address": "210 Oklahoma Ave",
    "address2": "123",
    "city": "Satsuma",
    "state": "FL",
    "zip": "32189",
    "source": "Friend",
    "message": "Testing",
    "account_type": "[\"Specialty Retail Location - Rugs\"]",
    "sample_set": true,
    "tax_exempt": true,
    "vat_tax_id": "93-1805911",
    "tax_proof": "gid://shopify/GenericFile/38482657902752",
    "clarity_id": "99512ad0-c8ab-4769-ad30-f6e71687954f",
    "owner": "[\"gid://shopify/Customer/8523485118624\"]"
  },
  "handle": "magnolify-inc",
  "display_name": "Magnolify, Inc.",
  "created_at": "2025-10-20T00:58:28-04:00",
  "updated_at": "2025-10-22T03:50:00-04:00"
}
```

**Processing Logic:**

1. **Verify webhook signature** (HMAC-SHA256 with `SHOPIFY_WEBHOOK_SECRET`)
2. **Log to database** (`webhook_logs` table)
3. **Check for `clarity_id`:**
   - **If exists:** Update CRM Account via `PUT /api/v1/Account/{clarity_id}`
   - **If missing:** Create new CRM Account via `POST /api/v1/Account`
4. **Save returned `AccountId` back to Shopify metaobject:**
   ```graphql
   mutation UpdateMetaobject {
     metaobjectUpdate(
       id: "gid://shopify/Metaobject/137780953248",
       metaobject: {
         fields: [{ key: "clarity_id", value: "26fb47bc-..." }]
       }
     ) {
       metaobject { id }
     }
   }
   ```

**Field Mapping (Shopify → CRM):**
```javascript
{
  Name: fields.company,
  CompanyPhone: fields.phone,
  Email: fields.email,
  Address1: fields.address,
  Address2: fields.address2,
  City: fields.city,
  State: fields.state,
  ZipCode: fields.zip,
  Website: fields.website,
  Instagram: fields.instagram ? `https://www.instagram.com/${fields.instagram}` : "",
  "Account Type": fields.account_type,
  "Sample Set": fields.sample_set ? "Yes" : "No",
  Registration: fields.tax_exempt ? "Registered with documentation" : "No documentation",
  Note: `Shopify Metaobject ID: ${id}`,
  Description: fields.message
}
```

### Webhook 2: `customers/update`

**Shopify sends:** When customer record is updated (including metafield changes).

**Endpoint:** `POST /api/webhooks/customers/update`

**Sample Payload:**
```json
{
  "id": 8523485118624,
  "email": "magnolify@gmail.com",
  "first_name": "Paul",
  "last_name": "Smith",
  "phone": "+13862445990",
  "state": "disabled",
  "tax_exempt": false,
  "addresses": [{
    "id": 9730211217568,
    "address1": "210 Oklahoma Ave",
    "city": "Satsuma",
    "province": "Florida",
    "zip": "32189",
    "country": "United States",
    "company": "Magnolify, Inc."
  }],
  "default_address": { /* same as above */ },
  "admin_graphql_api_id": "gid://shopify/Customer/8523485118624"
}
```

**Processing Logic:**

1. **Verify webhook signature**
2. **Log to database**
3. **Fetch customer's metafield** to get linked `wholesale_account`:
   ```graphql
   query GetCustomerMetafields {
     customer(id: "gid://shopify/Customer/8523485118624") {
       metafield(namespace: "custom", key: "wholesale_account") {
         value
       }
     }
   }
   ```
   **Returns:** `gid://shopify/Metaobject/137780953248`

4. **Fetch metaobject to get `clarity_id`:**
   ```graphql
   query GetMetaobject {
     metaobject(id: "gid://shopify/Metaobject/137780953248") {
       fields {
         key
         value
       }
     }
   }
   ```

5. **Check for existing contact in CRM:**
   - Query by email or linked `AccountId`
   - **If exists:** Update contact
   - **If missing:** Create new contact

6. **Create/Update CRM Contact:**
   ```json
   {
     "AccountId": "26fb47bc-...",
     "FirstName": "Paul",
     "LastName": "Smith",
     "Email": "magnolify@gmail.com",
     "Phone": "+13862445990",
     "Address1": "210 Oklahoma Ave",
     "City": "Satsuma",
     "State": "FL",
     "ZipCode": "32189"
   }
   ```

7. **Save `ContactId` to metaobject** (for future reference):
   - Could add a `clarity_contact_id` field to metaobject
   - Or store in a separate mapping table

### Webhook 3: Clarity CRM Webhooks (Confirmation)

**CRM sends:** When Account or Contact is created/updated in Clarity.

**Endpoints:**
- `POST /api/webhooks/clarity/account_create`
- `POST /api/webhooks/clarity/contact_create`

**Sample Account Payload:**
```json
{
  "Data": {
    "Type": "Converted"
  },
  "Event": "add",
  "Entity": "underitall",
  "EventId": "414524c5-3f6c-40de-a589-18fe3240d5ce",
  "Resource": "account",
  "ResourceId": "353e9122-d10f-4059-99f6-d63dd5707705",
  "EventHookId": "53746019-335f-4756-8f35-6d0e85f2c63d",
  "AppSignature": "claritysoft-webhook-97fa1165-b246-4211-aae6-8657c78260ec"
}
```

**Sample Contact Payload:**
```json
{
  "Data": {
    "Type": "Converted"
  },
  "Event": "add",
  "Resource": "contact",
  "ResourceId": "1d1e96b4-cbe2-41cf-990d-19de60054db8",
  "EventHookId": "5b9f02fe-48af-456c-bf46-8baece3b362c"
}
```

**Processing Logic:**
1. **Log to database** (`webhook_logs`)
2. **Extract `ResourceId`** (Account/Contact ID)
3. **Update metaobject with CRM IDs** (optional, for reference):
   - Add custom fields: `clarity_account_id`, `clarity_contact_id`
4. **Send admin notification** (optional)

---

## Data Flow Summary

### Initial Creation Flow

```
Registration Form Submission
    ↓
Database Record (status: pending)
    ↓
Admin Approval
    ↓
┌─────────────────────────────────────────────┐
│ Create Shopify Wholesale Account Metaobject │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Create Shopify Customer (with metafield)    │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Create Clarity CRM Account                  │
│ (Save AccountId to metaobject.clarity_id)   │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Create Clarity CRM Contact                  │
│ (Linked to AccountId)                       │
└─────────────────────────────────────────────┘
    ↓
Upload Tax ID Proof to CRM as Attachment
```

### Ongoing Sync Flow (Webhook-Driven)

**Scenario 1: Shopify Metaobject Updated**
```
Admin updates metaobject in Shopify
    ↓
Shopify fires metaobjects/update webhook
    ↓
Our app receives webhook → logs to DB
    ↓
Extracts clarity_id from metaobject
    ↓
Updates CRM Account via Clarity API
    ↓
CRM fires account_create webhook (confirmation)
    ↓
Our app logs confirmation
```

**Scenario 2: Shopify Customer Updated**
```
Admin updates customer in Shopify
    ↓
Shopify fires customers/update webhook
    ↓
Our app receives webhook → logs to DB
    ↓
Fetches customer metafield → gets metaobject GID
    ↓
Fetches metaobject → gets clarity_id
    ↓
Updates CRM Contact via Clarity API
    ↓
CRM fires contact_create webhook (confirmation)
    ↓
Our app logs confirmation
```

---

## Database Schema Updates Needed

### Add CRM Tracking Fields to Metaobject

**Shopify Admin:** Add custom fields to `wholesale_account` metaobject definition:
- `clarity_account_id` (Single line text)
- `clarity_contact_id` (Single line text)
- `last_synced_at` (Date and time)

### Webhook Logs Table (Already Exists)

```sql
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  source TEXT NOT NULL, -- 'shopify' or 'crm'
  payload JSONB,
  shop_domain TEXT,
  topic TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_webhook_logs_type ON webhook_logs(type);
CREATE INDEX idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX idx_webhook_logs_timestamp ON webhook_logs(timestamp DESC);
```

---

## Error Handling & Edge Cases

### 1. Customer Creation Fails (Shopify Basic Plan)
- **Action:** Continue with metaobject creation
- **Warning:** Log warning, notify admin
- **Workaround:** Manual customer creation or upgrade plan

### 2. CRM Account Creation Fails
- **Action:** Retry with exponential backoff (3 attempts)
- **Fallback:** Log error, send admin notification
- **Manual Fix:** Admin can retry via dashboard

### 3. Webhook Delivery Fails
- **Shopify:** Auto-retries for 48 hours
- **Our App:** Log all attempts in `webhook_logs`
- **Recovery:** Re-process failed webhooks via admin dashboard

### 4. Duplicate Prevention
- **Shopify:** Check for existing metaobject by `handle` before creation
- **CRM:** Use "Create Or Edit" operation (idempotent)
- **Customer:** Check email uniqueness before creation

### 5. Webhook Signature Verification Fails
- **Action:** Reject webhook with 401 status
- **Log:** Record failed verification attempt
- **Alert:** Notify admin if multiple failures (potential attack)

---

## Testing Checklist

### Manual Testing Steps

1. **Registration Submission:**
   - [ ] Fill out form with valid data
   - [ ] Submit and verify database record created
   - [ ] Verify status is `pending`

2. **Admin Approval:**
   - [ ] Log into admin dashboard
   - [ ] Approve registration
   - [ ] Verify Shopify metaobject created
   - [ ] Verify Shopify customer created (if applicable)
   - [ ] Verify CRM account created
   - [ ] Verify CRM contact created
   - [ ] Verify tax ID proof uploaded to CRM

3. **Webhook Reception:**
   - [ ] Update metaobject in Shopify admin
   - [ ] Verify `metaobjects/update` webhook received
   - [ ] Verify webhook logged in database
   - [ ] Verify CRM account updated
   - [ ] Update customer in Shopify admin
   - [ ] Verify `customers/update` webhook received
   - [ ] Verify CRM contact updated

4. **CRM Confirmation Webhooks:**
   - [ ] Create account in CRM manually
   - [ ] Verify `clarity/account_create` webhook received
   - [ ] Create contact in CRM manually
   - [ ] Verify `clarity/contact_create` webhook received

### Automated Testing (Future)

```javascript
// Test metaobject webhook processing
test('processes metaobjects/update webhook', async () => {
  const payload = { /* sample webhook payload */ };
  const response = await request(app)
    .post('/api/webhooks/metaobjects/update')
    .send(payload);
  
  expect(response.status).toBe(200);
  // Verify CRM API called
  // Verify database logged
});
```

---

## Monitoring & Observability

### Key Metrics to Track

1. **Registration Funnel:**
   - Submissions per day
   - Approval rate
   - Time to approval

2. **Integration Health:**
   - Shopify API success rate
   - CRM API success rate
   - Webhook delivery rate

3. **Error Rates:**
   - Failed customer creations
   - Failed CRM syncs
   - Webhook signature failures

### Logging Strategy

**Console Logs:**
```javascript
console.log("📥 Webhook received:", topic);
console.log("✅ CRM account created:", accountId);
console.log("❌ Customer creation failed:", error);
```

**Database Logs:**
- All webhooks in `webhook_logs`
- Failed operations flagged for review

**Admin Dashboard:**
- Recent webhook activity
- Failed sync attempts
- Retry queue

---

## Security Considerations

### 1. Webhook Verification
- **Shopify:** Verify HMAC-SHA256 signature on all webhooks
- **CRM:** Verify `AppSignature` matches expected value
- **Reject:** All unsigned or invalid webhooks

### 2. API Key Management
- **Environment Variables:** Store all keys in `.env` (never commit)
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

## Future Enhancements

1. **Bidirectional Sync:**
   - Currently: Shopify → CRM
   - Future: CRM → Shopify (update metaobjects when CRM changes)

2. **Customer Portal:**
   - Allow approved customers to log in
   - View order history
   - Update contact information (syncs back to Shopify + CRM)

3. **Automated Notifications:**
   - Email customer on approval
   - Slack notification for admin team
   - SMS alerts for urgent issues

4. **Bulk Import:**
   - CSV upload for existing wholesale customers
   - Automatic metaobject + CRM creation

5. **Analytics Dashboard:**
   - Registration trends
   - Top business types
   - Geographic distribution

---

## Support & Troubleshooting

### Common Issues

**Issue:** Webhook not received
- **Check:** Shopify webhook subscription is active
- **Verify:** Endpoint URL is publicly accessible
- **Test:** Use Shopify webhook tester in admin

**Issue:** CRM sync fails
- **Check:** API key is valid
- **Verify:** Payload matches Clarity API schema
- **Retry:** Use manual retry button in admin dashboard

**Issue:** Duplicate accounts created
- **Check:** Metaobject handle uniqueness
- **Fix:** Implement duplicate detection logic
- **Cleanup:** Manually merge duplicates in Shopify + CRM

### Contact Information

- **Technical Support:** dev@underitall.com
- **CRM API Docs:** https://docs.claritycrm.com/api
- **Shopify Webhooks:** https://shopify.dev/docs/api/admin-rest/webhooks

---

## Appendix: API Reference

### Shopify Admin API

**Create Metaobject:**
```
POST /admin/api/2024-10/graphql.json
```

**Create Customer:**
```
POST /admin/api/2024-10/customers.json
```

**Update Metaobject:**
```
POST /admin/api/2024-10/graphql.json
```

### Clarity CRM API

**Base URL:** `https://claritymobileapi.claritycrm.com`

**Create Account:**
```
POST /api/v1
Body: { APIKey, Resource: "Account", Operation: "Create Or Edit", Data }
```

**Create Contact:**
```
POST /api/v1
Body: { APIKey, Resource: "Contact", Operation: "Create Or Edit", Data }
```

**Upload Attachment:**
```
POST /api/v1/Attachment/Create
Body: { APIKey, Resource: "Attachment", Data }
```

### Our Webhook Endpoints

**Shopify Webhooks:**
- `POST /api/webhooks/shopify` (generic)
- `POST /api/webhooks/metaobjects/update`
- `POST /api/webhooks/customers/update`
- `POST /api/webhooks/customers/create`

**CRM Webhooks:**
- `POST /api/webhooks/clarity/account_create`
- `POST /api/webhooks/clarity/contact_create`

**Webhook Logs:**
- `GET /api/webhooks/logs?source=shopify&limit=100`

---

## Conclusion

This onboarding flow ensures seamless integration between our application, Shopify, and Clarity CRM, with Shopify serving as the source of truth and webhooks keeping all systems synchronized in near real-time.
